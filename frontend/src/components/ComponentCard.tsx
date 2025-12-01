import type { Product } from '../data/mockProducts';
import { cn } from '../lib/utils';
import { Check, Info } from 'lucide-react';

interface ComponentCardProps {
    product: Product;
    isSelected: boolean;
    onSelect: () => void;
    disabled?: boolean;
    forbidden?: boolean;
    selectedOptions?: Record<string, any>;
}

export function ComponentCard({ product, isSelected, onSelect, disabled, forbidden, selectedOptions }: ComponentCardProps) {
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
                (disabled || forbidden) && "opacity-50 cursor-not-allowed hover:border-slate-200 hover:shadow-none bg-slate-50"
            )}
            onClick={() => !disabled && onSelect()}
        >
            <div className="flex justify-between items-start mb-2">
                <div className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded uppercase">
                    {product.type}
                </div>
                {isSelected && (
                    <div className="bg-duagon-blue text-white p-1 rounded-full">
                        <Check size={12} strokeWidth={3} />
                    </div>
                )}
            </div>

            <h3 className="font-bold text-slate-900 mb-1">{product.name}</h3>
            <p className="text-sm text-slate-500 mb-4 line-clamp-2">{product.description}</p>

            <div className="mt-auto border-t border-slate-100 pt-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className={cn(totalWidth !== product.widthHp && "font-bold text-duagon-blue")}>
                        {totalWidth}HP
                    </span>
                    {product.heightU && <span>{product.heightU}U</span>}
                    <span className={cn(totalPower !== product.powerWatts && "font-bold text-duagon-blue")}>
                        {totalPower}W
                    </span>
                    {product.eol_date && (
                        <span className="text-amber-600 font-medium">EOL: {product.eol_date.split('-')[0]}</span>
                    )}
                </div>
                {product.connectors && product.connectors.length > 0 && (
                    <div className="text-[10px] text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                        <span className="font-semibold mr-1">Conn:</span>
                        <span className="font-mono">{product.connectors.join(', ')}</span>
                    </div>
                )}
            </div>
            <button
                className="text-slate-400 hover:text-duagon-blue"
                onClick={(e) => {
                    e.stopPropagation();
                    if (product.url) {
                        window.open(product.url, '_blank');
                    }
                }}
                title="View Product Details"
            >
                <Info size={16} />
            </button>
        </div>

    );
}
