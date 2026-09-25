import { useRef, useState } from "react";
import { Check, CloudUpload, FileText, Loader2, MoreHorizontal, RefreshCw, Search, UploadCloud } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function DocumentsPage() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | undefined>();
  const [status, setStatus] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();
  const documents = trpc.documents.list.useQuery({ query });
  const upload = trpc.documents.uploadPdf.useMutation({
    onSuccess: async result => {
      setStatus(`${result.documentName} indexed successfully. ${result.chunks} searchable chunks are ready for Chat.`);
      await utils.documents.list.invalidate();
    },
    onError: error => setStatus(error.message || "PDF could not be indexed."),
  });

  const handleFile = (file?: File) => {
    if (!file) return;
    setSelected(file.name);
    setStatus("");
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setStatus("Please upload a PDF file.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setStatus("This PDF is larger than 12 MB. Please upload a smaller file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const encoded = String(reader.result).split(",")[1] || "";
      upload.mutate({ fileName: file.name, data: encoded });
    };
    reader.onerror = () => setStatus("The file could not be read. Please try again.");
    reader.readAsDataURL(file);
  };

  return <div className="page documents-page">
    <div className="page-heading-row"><div><div className="eyebrow"><span className="eyebrow-dot" /> Admin workspace</div><h1>Document library</h1><p>Upload an official PDF, index its text, then ask Chat questions grounded in that document.</p></div><button className="button-primary" onClick={() => inputRef.current?.click()} disabled={upload.isPending}>{upload.isPending ? <Loader2 size={16} className="spin" /> : <UploadCloud size={16} />} {upload.isPending ? "Indexing PDF..." : "Upload PDF"}</button></div>
    <input ref={inputRef} type="file" accept="application/pdf,.pdf" hidden onChange={event => handleFile(event.target.files?.[0])} />
    <div className="upload-zone" onClick={() => inputRef.current?.click()}><div className="upload-icon"><CloudUpload size={22} /></div><div><strong>{selected || "Drop a PDF here, or browse"}</strong><span>PDF only · up to 12 MB · text extraction and indexing starts automatically</span></div><button onClick={event => { event.stopPropagation(); inputRef.current?.click(); }} disabled={upload.isPending}>Choose PDF</button></div>
    {status && <div className={`upload-status ${status.includes("successfully") ? "success" : "error"}`}><Check size={15} /> {status}</div>}
    <div className="pdf-next-step"><FileText size={18} /><div><strong>Next step: ask from this PDF</strong><p>After indexing finishes, open <a href="/chat">Ask AI</a> and ask a question using the document’s exact terms. Matching passages appear as citations below the answer.</p></div></div>
    <div className="library-toolbar"><div className="library-title"><h2>Indexed sources <span>{documents.data?.length ?? 0}</span></h2><p>Uploaded PDF text is available to the grounded retrieval service.</p></div><div className="table-search"><Search size={15} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search documents" /></div></div>
    <div className="document-table"><div className="table-head"><span>Document</span><span>Category</span><span>Chunks</span><span>Uploaded</span><span>Status</span><span /></div>{(documents.data || []).map(document => <div className="table-row" key={document.id}><div className="table-doc"><span className="doc-icon"><FileText size={16} /></span><div><strong>{document.documentName}</strong><span>Version {document.version} · {document.section}</span></div></div><span className="table-category">{document.category}</span><span className="table-muted">{document.chunks}</span><span className="table-muted">{document.uploaded}</span><span className="table-status"><span className="status-dot" /> {document.status}</span><button className="icon-button" aria-label={`Actions for ${document.documentName}`}><MoreHorizontal size={17} /></button></div>)}</div><div className="security-callout"><div className="callout-check"><Check size={15} /></div><div><strong>Source integrity is on</strong><p>Only indexed document chunks can influence answers. Every result keeps its filename, section, and page number.</p></div><RefreshCw size={17} className="callout-icon" /></div>
  </div>;
}
