import { useState, useEffect } from 'react';
import { useConfigStore } from '../store/configStore';
import { cn } from '../lib/utils';

import { ComponentCard } from '../components/ComponentCard';
import { SubConfigModal } from '../components/SubConfigModal';
import { ArrowLeft, ArrowRight, Zap, Box, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Product } from '../data/mockProducts';

export function ChassisPage() {
    const { slots, chassisId, psuId, setChassis, setPsu, products, fetchProducts, validateRules, chassisOptions: savedChassisOptions, psuOptions: savedPsuOptions } = useConfigStore();

    useEffect(() => {
        if (products.length === 0) fetchProducts();
    }, []);

    // Modal State
    const [configuringProduct, setConfiguringProduct] = useState<Product | null>(null);
    const [tempOptions, setTempOptions] = useState<Record<string, any>>({});

    // Calculate total power consumption
    // Calculate total power consumption (including options)
    const totalPower = slots.reduce((total, slot) => {
        if (!slot.componentId) return total;
        const product = products.find((p: any) => p.id === slot.componentId);
        if (!product) return total;

        let itemPower = product.powerWatts || 0;

        // Add power from options
        if (product.options && slot.selectedOptions) {
            Object.entries(slot.selectedOptions).forEach(([optId, optVal]) => {
                const optDef = (product.options as any[]).find((o: any) => o.id === optId);
                if (optDef) {
                    if (optDef.type === 'select') {
                        const choice = optDef.choices.find((c: any) => c.value === optVal);
                        if (choice && choice.powerMod) itemPower += choice.powerMod;
                    } else if (optDef.type === 'boolean' && optVal === true) {
                        if (optDef.powerMod) itemPower += optDef.powerMod;
                    }
                }
            });
        }

        return total + itemPower;
    }, 0);

    // Add 20% buffer
    const requiredPower = Math.ceil(totalPower * 1.2);

    // Filter products
    const chassisOptions = products.filter((p: any) => p.type === 'chassis');

    // Filter PSUs based on selected chassis height
    const selectedChassis = products.find((p: any) => p.id === chassisId);
    const psuOptions = products.filter((p: any) => {
        if (p.type !== 'psu') return false;

        // If no chassis selected, show all PSUs (or maybe none? let's show all)
        if (!selectedChassis) return true;

        // Filter by compatibility if defined in product rules (not implemented yet fully)
        // For now, let's just show all PSUs regardless of chassis, as requested.
        // The user specifically asked to remove the hardcoded rule for 4U/3U and open frame.

        return true;
    });

    const canProceed = chassisId && psuId;

    const handleSelectProduct = (product: Product, type: 'chassis' | 'psu') => {
        const currentId = type === 'chassis' ? chassisId : psuId;
        const isAlreadySelected = currentId === product.id;

        if (isAlreadySelected) {
            // Unselect
            if (type === 'chassis') setChassis(null);
            else setPsu(null);
            return;
        }

        // Check for rule violations
        const proposedState = {
            ...useConfigStore.getState(),
            chassisId: type === 'chassis' ? product.id : chassisId,
            psuId: type === 'psu' ? product.id : psuId
        };

        const violations = validateRules(proposedState);
        if (violations.length > 0) {
            toast.error(`Cannot select this component:\n\n${violations.join('\n')}`);
            return;
        }

        if (product.options && product.options.length > 0) {
            // Open modal for configuration
            setConfiguringProduct(product);
            // Initialize default options
            const defaults: Record<string, any> = {};
            product.options.forEach(opt => {
                defaults[opt.id] = opt.default;
            });
            setTempOptions(defaults);
        } else {
            // Direct selection
            if (type === 'chassis') setChassis(product.id);
            else setPsu(product.id);
        }
    };

    // Helper to check if a product is forbidden
    const isForbidden = (product: Product, type: 'chassis' | 'psu') => {
        const proposedState = {
            ...useConfigStore.getState(),
            chassisId: type === 'chassis' ? product.id : chassisId,
            psuId: type === 'psu' ? product.id : psuId
        };
        return validateRules(proposedState).length > 0;
    };

    const handleSaveConfiguration = (options: any) => {
        if (configuringProduct) {
            if (configuringProduct.type === 'chassis') {
                setChassis(configuringProduct.id, options);
            } else if (configuringProduct.type === 'psu') {
                setPsu(configuringProduct.id, options);
            }
            setConfiguringProduct(null);
        }
    };

    return (
        <div className="space-y-8">
            {/* Sub-Configuration Modal */}
            <SubConfigModal
                isOpen={!!configuringProduct}
                onClose={() => setConfiguringProduct(null)}
                onSave={() => handleSaveConfiguration(tempOptions)}
                title={`Configure ${configuringProduct?.name}`}
            >
                <div className="space-y-6">
                    {configuringProduct?.options?.map(option => (
                        <div key={option.id} className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700">
                                {option.label}
                            </label>

                            {option.type === 'select' ? (
                                <select
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={tempOptions[option.id] || ''}
                                    onChange={(e) => setTempOptions({ ...tempOptions, [option.id]: e.target.value })}
                                >
                                    {option.choices?.map(choice => {
                                        let priceLabel = '';
                                        if (choice.priceMod) {
                                            if (typeof choice.priceMod === 'number') {
                                                priceLabel = `(+€${choice.priceMod})`;
                                            } else {
                                                const basePrice = choice.priceMod['1'] || 0;
                                                priceLabel = `(starts at +€${basePrice})`;
                                            }
                                        }
                                        return (
                                            <option key={choice.value} value={choice.value}>
                                                {choice.label} {priceLabel}
                                            </option>
                                        );
                                    })}
                                </select>
                            ) : option.type === 'boolean' ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id={option.id}
                                        className="w-4 h-4 text-duagon-blue rounded border-slate-300 focus:ring-duagon-blue"
                                        checked={!!tempOptions[option.id]}
                                        onChange={(e) => setTempOptions({ ...tempOptions, [option.id]: e.target.checked })}
                                    />
                                    <label htmlFor={option.id} className="text-sm text-slate-600">
                                        Enable {option.priceMod ? (typeof option.priceMod === 'number' ? `(+€${option.priceMod})` : `(starts at +€${option.priceMod['1']})`) : ''}
                                    </label>
                                </div>
                            ) : null}
                        </div>
                    ))}
                </div>
            </SubConfigModal>

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Chassis & Environment</h1>
                    <p className="text-slate-500">
                        Select a chassis and power supply unit for your system.
                    </p>
                </div>
                <div className="flex gap-4">
                    <Link
                        to="/components"
                        className="inline-flex items-center justify-center gap-2 text-slate-600 px-4 py-2 rounded-lg font-medium hover:bg-slate-100 transition-colors"
                    >
                        <ArrowLeft size={18} />
                        Back
                    </Link>
                    {canProceed ? (
                        <Link
                            to="/quote"
                            className="inline-flex items-center justify-center gap-2 bg-duagon-blue text-white px-6 py-2 rounded-lg font-semibold hover:bg-duagon-blue/90 transition-colors"
                        >
                            Next: Quote
                            <ArrowRight size={18} />
                        </Link>
                    ) : (
                        <button
                            disabled
                            className="inline-flex items-center justify-center gap-2 bg-slate-300 text-slate-500 px-6 py-2 rounded-lg font-semibold cursor-not-allowed"
                            title="Please select both a Chassis and a Power Supply to proceed."
                        >
                            Next: Quote
                            <ArrowRight size={18} />
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Power Summary */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <Zap className="text-amber-500" />
                            Power Budget
                        </h2>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-600">Component Consumption:</span>
                                <span className="font-medium">{totalPower}W</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-600">Buffer (+20%):</span>
                                <span className="font-medium">+{Math.ceil(totalPower * 0.2)}W</span>
                            </div>
                            <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                                <span className="font-bold text-slate-900">Required Power:</span>
                                <span className="font-bold text-xl text-duagon-blue">{requiredPower}W</span>
                            </div>
                        </div>

                        {/* PSU Validation Warning */}
                        {psuId && (
                            (() => {
                                const psu = products.find(p => p.id === psuId);
                                const psuCapacity = psu ? Math.abs(psu.powerWatts || 0) : 0;
                                // Only check if PSU has capacity (internal PSUs)
                                if (psuCapacity > 0 && requiredPower > psuCapacity) {
                                    return (
                                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-medium flex items-start gap-2">
                                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                            <div>
                                                Warning: Selected PSU ({psuCapacity}W) is insufficient for the required power ({requiredPower}W).
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            })()
                        )}
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800">
                        <p>
                            <strong>Tip:</strong> We recommend a power supply with at least {requiredPower}W output to ensure system stability under full load.
                        </p>
                    </div>
                </div>

                {/* Selection Area */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Chassis Selection */}
                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Box size={24} className="text-slate-400" />
                            Select Chassis
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {chassisOptions.map(chassis => {
                                const forbidden = isForbidden(chassis, 'chassis');
                                return (
                                    <div key={chassis.id} className={cn("relative", forbidden && "opacity-50 grayscale")}>
                                        <ComponentCard
                                            product={chassis}
                                            isSelected={chassisId === chassis.id}
                                            onSelect={() => !forbidden && handleSelectProduct(chassis, 'chassis')}
                                            selectedOptions={chassisId === chassis.id ? savedChassisOptions : undefined}
                                        />
                                        {forbidden && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-slate-100/50 cursor-not-allowed" title="Forbidden by configuration rules">
                                                <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded">Forbidden</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* PSU Selection */}
                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Zap size={24} className="text-slate-400" />
                            Select Power Supply
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {psuOptions.map(psu => {
                                const forbidden = isForbidden(psu, 'psu');
                                return (
                                    <div key={psu.id} className={cn("relative", forbidden && "opacity-50 grayscale")}>
                                        <ComponentCard
                                            product={psu}
                                            isSelected={psuId === psu.id}
                                            onSelect={() => !forbidden && handleSelectProduct(psu, 'psu')}
                                            selectedOptions={psuId === psu.id ? savedPsuOptions : undefined}
                                        />
                                        {forbidden && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-slate-100/50 cursor-not-allowed" title="Forbidden by configuration rules">
                                                <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded">Forbidden</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
