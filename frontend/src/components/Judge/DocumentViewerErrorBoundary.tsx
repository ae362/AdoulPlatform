import React from 'react';
import { AlertTriangle, RotateCw, FileWarning } from 'lucide-react';
import { logViewerEvent } from '../../utils/documentTelemetry';

export interface DocumentViewerErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onReset?: () => void;
  submissionId?: string;
  documentName?: string;
}

export interface DocumentViewerErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Isolated Error Boundary component for the Judicial Document Viewer.
 * Contains PDF rendering crashes, corrupt DOCX assets, or unhandled stream exceptions
 * without crashing the main judicial portal or disrupting the judge's decision panel.
 */
export class DocumentViewerErrorBoundary extends React.Component<
  DocumentViewerErrorBoundaryProps,
  DocumentViewerErrorBoundaryState
> {
  constructor(props: DocumentViewerErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<DocumentViewerErrorBoundaryState> {
    return {
      hasError: true,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });

    // Log telemetry event for document viewer crash
    logViewerEvent('VIEWER_ERROR', {
      error: error.message,
      stack: errorInfo.componentStack,
      submissionId: this.props.submissionId,
      documentName: this.props.documentName,
    });

    console.error('[DocumentViewerErrorBoundary] Caught error in viewer pane:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.state.error?.message || 'حدث خطأ غير متوقع أثناء معالجة المستند';

      return (
        <div 
          className="w-full h-full min-h-[550px] bg-slate-50/90 backdrop-blur-sm border border-slate-200/80 rounded-2xl flex flex-col items-center justify-center p-8 text-center select-none animate-in fade-in duration-300"
          dir="rtl"
        >
          {/* Warning Icon Badge */}
          <div className="w-20 h-20 rounded-3xl bg-amber-50 border border-amber-200/80 flex items-center justify-center shadow-lg shadow-amber-900/5 mb-6 text-amber-600 animate-bounce">
            <FileWarning size={38} className="stroke-[1.75]" />
          </div>

          {/* Heading */}
          <h3 className="text-2xl font-black font-amiri text-slate-900 mb-2">
            تعذر عرض المستند المعين
          </h3>

          {/* Document indicator */}
          {this.props.documentName && (
            <div className="mb-4 px-4 py-1 rounded-full bg-slate-200/70 text-slate-700 text-xs font-bold font-mono">
              {this.props.documentName}
            </div>
          )}

          {/* Description */}
          <p className="text-slate-600 font-bold font-amiri text-base max-w-lg leading-relaxed mb-6">
            تعذر استخراج أو معالجة بنية المستند الرقمي بسبب خلل في تدفق البيانات، أو تلف في صيغة الملف، أو تعليق محرك العرض. تم عزل الخطأ لضمان استمرار عمل منصة الفحص والقرار القضائي دون انقطاع.
          </p>

          {/* Error Summary Accordion */}
          <div className="w-full max-w-lg mb-8 p-4 bg-white rounded-xl border border-slate-200 shadow-inner text-right">
            <div className="flex items-center gap-2 text-xs font-black text-rose-600 mb-1">
              <AlertTriangle size={14} />
              <span>تفاصيل الخطأ الفني:</span>
            </div>
            <p className="text-xs font-mono text-slate-700 break-words line-clamp-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              {errorMessage}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-8 py-3.5 bg-[#023120] text-[#E6BE8A] hover:brightness-110 active:scale-95 rounded-2xl font-black font-amiri text-base shadow-xl shadow-[#023120]/20 transition-all flex items-center gap-3 border border-[#E6BE8A]/20"
            >
              <RotateCw size={18} />
              <span>إعادة تحميل الوثيقة</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
