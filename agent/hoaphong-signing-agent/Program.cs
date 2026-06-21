using System.Security.Cryptography;
using System.Security.Cryptography.Xml;
using System.Security.Cryptography.X509Certificates;
using System.Xml;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

var token = Environment.GetEnvironmentVariable("SIGNING_AGENT_TOKEN") ?? "";

app.Use(async (ctx, next) =>
{
    if (!string.IsNullOrWhiteSpace(token))
    {
        var auth = ctx.Request.Headers.Authorization.ToString();
        if (!auth.Equals($"Bearer {token}", StringComparison.Ordinal))
        {
            ctx.Response.StatusCode = 401;
            await ctx.Response.WriteAsJsonAsync(new { error = "Unauthorized" });
            return;
        }
    }
    await next();
});

app.MapGet("/health", () =>
{
    return Results.Json(new
    {
        ok = true,
        mode = "certificate-scan",
        message = "Signing agent is running"
    });
});

app.MapGet("/certificates", () =>
{
    var items = new List<object>();
    using var store = new X509Store(StoreName.My, StoreLocation.CurrentUser);
    store.Open(OpenFlags.ReadOnly | OpenFlags.OpenExistingOnly);

    foreach (var cert in store.Certificates)
    {
        if (!cert.HasPrivateKey) continue;
        items.Add(new
        {
            thumbprint = cert.Thumbprint ?? "",
            subject = cert.Subject ?? "",
            issuer = cert.Issuer ?? "",
            serialNumber = cert.SerialNumber ?? "",
            provider = cert.GetKeyAlgorithm() ?? "unknown",
            notBefore = cert.NotBefore.ToString("O"),
            notAfter = cert.NotAfter.ToString("O"),
            hasPrivateKey = cert.HasPrivateKey
        });
    }

    return Results.Json(new { items });
});

app.MapPost("/sign", async (SignRequest req) =>
{
    if (string.IsNullOrWhiteSpace(req.Xml))
    {
        return Results.BadRequest(new { error = "Missing xml" });
    }
    if (string.IsNullOrWhiteSpace(req.Thumbprint))
    {
        return Results.BadRequest(new { error = "Missing thumbprint" });
    }

    var cert = FindCertByThumbprint(req.Thumbprint);
    if (cert == null)
    {
        return Results.NotFound(new { error = "Certificate not found in CurrentUser\\My" });
    }
    if (!cert.HasPrivateKey)
    {
        return Results.BadRequest(new { error = "Certificate does not have private key" });
    }

    try
    {
        var signed = SignXml(req.Xml, cert);
        return Results.Json(new
        {
            ok = true,
            signedXml = signed,
            cert = new
            {
                thumbprint = cert.Thumbprint ?? "",
                subject = cert.Subject ?? "",
                issuer = cert.Issuer ?? ""
            },
            message = "Ký XML thành công."
        });
    }
    catch (Exception ex)
    {
        return Results.Json(new
        {
            ok = false,
            error = ex.Message
        }, statusCode: 400);
    }
});

app.Run();

static X509Certificate2? FindCertByThumbprint(string thumbprint)
{
    var normalized = thumbprint.Replace(" ", "").Trim().ToUpperInvariant();
    using var store = new X509Store(StoreName.My, StoreLocation.CurrentUser);
    store.Open(OpenFlags.ReadOnly | OpenFlags.OpenExistingOnly);
    foreach (var cert in store.Certificates)
    {
        if (!cert.HasPrivateKey) continue;
        var tp = (cert.Thumbprint ?? "").Replace(" ", "").Trim().ToUpperInvariant();
        if (tp == normalized) return cert;
    }
    return null;
}

static string SignXml(string xml, X509Certificate2 cert)
{
    var doc = new XmlDocument
    {
        PreserveWhitespace = true
    };
    doc.LoadXml(xml);

    var rsa = cert.GetRSAPrivateKey();
    if (rsa == null)
    {
        throw new InvalidOperationException("Certificate private key is not RSA.");
    }

    var signedXml = new SignedXml(doc)
    {
        SigningKey = rsa
    };

    var reference = new Reference
    {
        Uri = ""
    };
    reference.AddTransform(new XmlDsigEnvelopedSignatureTransform());
    reference.AddTransform(new XmlDsigC14NTransform());
    signedXml.AddReference(reference);

    var keyInfo = new KeyInfo();
    keyInfo.AddClause(new KeyInfoX509Data(cert));
    signedXml.KeyInfo = keyInfo;
    var signedInfo = signedXml.SignedInfo ?? throw new InvalidOperationException("SignedInfo is null.");
    signedInfo.CanonicalizationMethod = SignedXml.XmlDsigCanonicalizationUrl;
    signedInfo.SignatureMethod = SignedXml.XmlDsigRSASHA256Url;

    signedXml.ComputeSignature();
    var xmlDigitalSignature = signedXml.GetXml();
    var root = doc.DocumentElement ?? throw new InvalidOperationException("XML khong co root element.");
    root.AppendChild(doc.ImportNode(xmlDigitalSignature, true));
    return doc.OuterXml;
}

public sealed record SignRequest(string Xml, string Thumbprint);
