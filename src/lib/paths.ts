/** Đường dẫn ERP — tách khỏi website giới thiệu công ty */
export const ERP = {
  base: "/erp",
  login: "/erp/login",
  forgotPassword: "/erp/quen-mat-khau",
  resetPassword: "/erp/dat-lai-mat-khau",
  changePassword: "/erp/doi-mat-khau",
  admin: "/erp/admin",
  khoGo: "/erp/kho-go",
  khoGoNhap: "/erp/kho-go/nhap-kho",
  khoGoPhat: "/erp/kho-go/phat-go",
  khoGoDonHang: "/erp/kho-go/don-hang",
  kien: (id: number | string) => `/erp/kho-go/kien/${id}`,
  xnk: "/erp/xnk",
  xnkImport: "/erp/xnk/hai-quan-nhap",
  xnkConfig: "/erp/xnk/cau-hinh",
  xnkImportDetail: (id: number | string) => `/erp/xnk/hai-quan-nhap/${id}`,
} as const;
