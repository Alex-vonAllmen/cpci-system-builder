import type { Product } from '../data/mockProducts';
import { cn } from '../lib/utils';
import { Check, Info, ExternalLink } from 'lucide-react';

interface ComponentCardProps {
    product: Product;
    isSelected: boolean;
    onSelect: () => void;
    onViewDetails: () => void;
    disabled?: boolean;
    forbidden?: boolean;
    incompatible?: boolean;
    selectedOptions?: Record<string, any>;
}

export function ComponentCard({ product, isSelected, onSelect, onViewDetails, disabled, forbidden, incompatible, selectedOptions }: ComponentCardProps) {
    // Calculate total power and width including options
    let totalPower = product.powerWatts || 0;
    let totalWidth = product.widthHp || 0;

    if (product.options && selectedOptions) {
        Object.entries(selectedOptions).forEach(([optId, optVal]) => {
            const optDef = (product.options as any[]).find((o: any) => o.id === optId);
            if (optDef) {
                if (optDef.type === 'select') {
                    const choice = optDef.choices.find((c: any) => c.value === optVal);
                    if (choice) {
                        if (choice.powerMod) totalPower += choice.powerMod;
                        if (choice.widthMod) totalWidth += choice.widthMod;
                    }
                } else if (optDef.type === 'boolean' && optVal === true) {
                    if (optDef.powerMod) totalPower += optDef.powerMod;
                    // Boolean widthMod not supported yet but could be
                }
            }
        });
    }
    return (
        <div
            className={cn(
                "relative flex flex-col p-4 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md",
                isSelected
                    ? "border-duagon-blue bg-blue-50"
                    : "border-slate-200 bg-white hover:border-duagon-blue/50",
                (disabled || forbidden) && "opacity-50 cursor-not-allowed hover:border-slate-200 hover:shadow-none bg-slate-50",
                incompatible && "opacity-60 grayscale bg-slate-50 hover:border-amber-300 hover:bg-amber-50"
            )}
            onClick={() => !disabled && onSelect()}
        >
            <div className="flex justify-between items-start mb-2">
                <div className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded uppercase">
                    {product.type}
                </div>
                <div className="flex gap-2">
                    {isSelected && (
                        <div className="bg-duagon-blue text-white p-1 rounded-full">
                            <Check size={12} strokeWidth={3} />
                        </div>
                    )}
                </div>
            </div>

            <h3 className="font-bold text-slate-900 mb-1">{product.name}</h3>
            <p className="text-sm text-slate-500 mb-2 line-clamp-2">{product.description}</p>



            {/* Selected Options Display */}
            {product.options && selectedOptions && (
                <div className="mb-4 space-y-1">
                    {Object.entries(selectedOptions).map(([optId, optVal]) => {
                        const optDef = (product.options as any[]).find((o: any) => o.id === optId);
                        if (!optDef) return null;

                        // Only show if value is truthy (for boolean) or selected (for select)
                        // And skip if it's the default value? User asked to "Show selected options".
                        // Usually "selected" implies non-default or explicit choice.
                        // But for now, let's show everything that is "truthy" or a specific selection.

                        if (optDef.type === 'boolean' && !optVal) return null;
                        if (optDef.type === 'select' && !optVal) return null;

                        let displayValue = '';
                        if (optDef.type === 'boolean') {
                            displayValue = 'Enabled';
                        } else {
                            const choice = optDef.choices.find((c: any) => c.value === optVal);
                            displayValue = choice ? choice.label : optVal;
                        }

                        return (
                            <div key={optId} className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded inline-block mr-1 mb-1 border border-slate-200">
                                <span className="font-semibold">{optDef.label}:</span> {displayValue}
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="mt-auto border-t border-slate-100 pt-3 flex items-center justify-between text-xs text-slate-500">
                <div className="flex gap-3">
                    <span className={cn(totalWidth !== product.widthHp && "font-bold text-duagon-blue")}>
                        {totalWidth}HP
                    </span>
                    {product.heightU && <span>{product.heightU}U</span>}
                    <span className={cn(totalPower !== product.powerWatts && "font-bold text-duagon-blue")}>
                        {totalPower}W
                    </span>
                </div>

                <div className="flex gap-2">
                    <button
                        className="text-slate-400 hover:text-duagon-blue p-1 rounded-full hover:bg-slate-100 transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            onViewDetails();
                        }}
                        title="View Details"
                    >
                        <Info size={16} />
                    </button>
                    <button
                        className="text-slate-400 hover:text-duagon-blue p-1 rounded-full hover:bg-slate-100 transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (product.url) {
                                window.open(product.url, '_blank');
                            }
                        }}
                        title="Open Product Page"
                    >
                        <ExternalLink size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
