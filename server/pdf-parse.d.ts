declare module "pdf-parse" {
  const pdfParse: (data: Buffer) => Promise<{ text: string; numpages: number }>;
  export default pdfParse;
}

declare module "pdf-parse/lib/pdf-parse.js" {
  const pdfParse: (data: Buffer) => Promise<{ text: string; numpages: number }>;
  export default pdfParse;
}
