import { SubConfigModal } from './SubConfigModal';
import { Upload } from 'lucide-react';

interface ImportResultModalProps {
    isOpen: boolean;
    onClose: () => void;
    results: {
        created: number;
        updated: number;
        failed?: number;
    } | null;
    title?: string;
}

export function ImportResultModal({ isOpen, onClose, results, title = "Import Successful" }: ImportResultModalProps) {
    if (!results) return null;

    const { created, updated, failed = 0 } = results;
    const hasFailures = failed > 0;

    return (
        <SubConfigModal
            isOpen={isOpen}
            onClose={onClose}
            onSave={onClose}
            title={title}
            saveLabel="OK"
        >
            <div className="space-y-4">
                <div className={`flex items-center gap-3 p-4 rounded-lg ${hasFailures ? 'bg-orange-50 text-orange-800' : 'bg-green-50 text-green-800'}`}>
                    <div className={`p-2 rounded-full ${hasFailures ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                        <Upload size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold">Import Complete</h4>
                        <p className="text-sm opacity-90">
                            {hasFailures
                                ? "The import completed with some warnings/errors."
                                : "The data has been successfully imported."}
                        </p>
                    </div>
                </div>

                <div className={`grid ${hasFailures ? 'grid-cols-3' : 'grid-cols-2'} gap-4`}>
                    <div className="bg-slate-50 p-4 rounded-lg text-center border border-slate-200">
                        <div className="text-3xl font-bold text-slate-900">{created}</div>
                        <div className="text-sm text-slate-500 font-medium">New Added</div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg text-center border border-slate-200">
                        <div className="text-3xl font-bold text-slate-900">{updated}</div>
                        <div className="text-sm text-slate-500 font-medium">Updated</div>
                    </div>
                    {hasFailures && (
                        <div className="bg-red-50 p-4 rounded-lg text-center border border-red-200">
                            <div className="text-3xl font-bold text-red-600">{failed}</div>
                            <div className="text-sm text-red-500 font-medium">Failed</div>
                        </div>
                    )}
                </div>
            </div>
        </SubConfigModal>
    );
}
