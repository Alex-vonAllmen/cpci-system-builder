import { useState, useEffect } from 'react';
import { useConfigStore } from '../store/configStore';
import { ComponentCard } from '../components/ComponentCard';
import { BackplaneVisualizer } from '../components/BackplaneVisualizer';
import { ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SubConfigModal } from '../components/SubConfigModal';
import { ProductDetailsModal } from '../components/ProductDetailsModal';
import type { Product } from '../data/mockProducts';
import { cn } from '../lib/utils';

import { useToast } from '../components/ui/Toast';

export function ComponentsPage() {
    const { slots, setSlotComponent, setSlotOptions, products, fetchProducts, validateRules, psuId, getRemainingInterfaces } = useConfigStore();
    const [selectedSlotId, setSelectedSlotId] = useState<number | null>(1);
    const [categoryFilter, setCategoryFilter] = useState<string>('All');
    const toast = useToast();

    useEffect(() => {
        fetchProducts();
    }, []);

    // Modal State
    const [configuringProduct, setConfiguringProduct] = useState<Product | null>(null);
    const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
    const [tempOptions, setTempOptions] = useState<Record<string, any>>({});

    const currentSlot = slots.find(s => s.id === selectedSlotId);
    const isSystemSlot = currentSlot?.type === 'system';
    const isBlocked = !!currentSlot?.blockedBy;

    // Calculate available slots based on Chassis and PSU
    // const chassis = products.find(p => p.id === chassisId); // Unused
    const psu = products.find(p => p.id === psuId);

    // Default to 9 slots if not set
    // If PSU takes space (width_hp > 0), reduce slots.
    // Assuming standard 84HP rack = 21 slots (but we usually have 9-slot backplanes).
    // Let's stick to the "Slot Count" logic.
    // If PSU is pluggable (width > 0), it consumes slots from the RIGHT?
    // Let's assume it consumes slots from the end.

    const psuSlots = psu && psu.width_hp > 0 ? Math.ceil(psu.width_hp / 4) : 0;
    const totalSlots = slots.length;
    const availableSlotCount = totalSlots - psuSlots;

    // Filter products based on slot type and category
    const availableProducts = products.filter((p: Product) => {
        // 1. System Slot Check
        if (isSystemSlot) return p.type === 'cpu';
        if (p.type === 'cpu') return false; // CPUs only in system slot

        // 2. Category Filter
        if (['chassis', 'psu'].includes(p.type)) return false;

        if (categoryFilter !== 'All') {
            if (categoryFilter === 'Storage' && p.type !== 'storage') return false;
            if (categoryFilter === 'Network' && p.type !== 'network') return false;
            if (categoryFilter === 'I/O' && p.type !== 'io') return false;
            if (categoryFilter === 'Miscellaneous' && p.type !== 'miscellaneous') return false;
        }

        return true;
    });

    // Helper to check if a product is forbidden for the current slot
    const isProhibited = (product: Product) => {
        if (!currentSlot) return false;
        const proposedState = {
            ...useConfigStore.getState(),
            slots: slots.map(s => s.id === currentSlot.id ? { ...s, componentId: product.id } : s)
        };
        return validateRules(proposedState).length > 0;
    };

    const handleSelectProduct = (product: Product) => {
        if (selectedSlotId === null) return;

        const isAlreadySelected = currentSlot?.componentId === product.id;

        if (isAlreadySelected) {
            // Unselect
            setSlotComponent(selectedSlotId, null);
            return;
        }

        // Check rules
        if (isProhibited(product)) {
            const proposedState = {
                ...useConfigStore.getState(),
                slots: slots.map(s => s.id === currentSlot?.id ? { ...s, componentId: product.id } : s)
            };
            const violations = validateRules(proposedState);
            toast.error(`Cannot select this component:\n- ${violations.join('\n- ')}`);
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
            setSlotComponent(selectedSlotId, product.id);
        }
    };

    const handleSaveConfiguration = (options: any) => {
        if (configuringProduct && selectedSlotId !== null) {
            setSlotComponent(selectedSlotId, configuringProduct.id);
            setSlotOptions(selectedSlotId, options);
            setConfiguringProduct(null);
        }
    };

    const hasCpuSelected = slots.some(s => s.type === 'system' && s.componentId);

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
                                                // Show base price (1+) for tiered
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

            {/* Product Details Modal */}
            <ProductDetailsModal
                isOpen={!!viewingProduct}
                onClose={() => setViewingProduct(null)}
                product={viewingProduct}
            />

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Select Components</h1>
                    <p className="text-slate-500">
                        Choose a component for each slot in your system.
                    </p>
                </div>
                <div className="flex gap-4">
                    <Link
                        to="/"
                        className="inline-flex items-center justify-center gap-2 text-slate-600 px-4 py-2 rounded-lg font-medium hover:bg-slate-100 transition-colors"
                    >
                        <ArrowLeft size={18} />
                        Back
                    </Link>
                    {hasCpuSelected ? (
                        <Link
                            to="/chassis"
                            className="inline-flex items-center justify-center gap-2 bg-duagon-blue text-white px-6 py-2 rounded-lg font-semibold hover:bg-duagon-blue/90 transition-colors"
                        >
                            Next: Chassis
                            <ArrowRight size={18} />
                        </Link>
                    ) : (
                        <button
                            disabled
                            className="inline-flex items-center justify-center gap-2 bg-slate-300 text-slate-500 px-6 py-2 rounded-lg font-semibold cursor-not-allowed"
                            title="Please select a CPU for the system slot to proceed."
                        >
                            Next: Chassis
                            <ArrowRight size={18} />
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Visualizer & Slot Selection */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">System Topology</h2>
                        <div className="mb-6">
                            <BackplaneVisualizer />
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-sm font-medium text-slate-700">Select a slot to configure:</h3>
                            <div className="grid grid-cols-5 gap-2">
                                {slots.map(slot => {
                                    const isSlotBlocked = !!slot.blockedBy;
                                    const isPsuSlot = slot.type === 'psu';
                                    // Disable if blocked or PSU
                                    const isSlotDisabled = isPsuSlot;

                                    return (
                                        <button
                                            key={slot.id}
                                            onClick={() => !isSlotDisabled && !isSlotBlocked && setSelectedSlotId(slot.id)}
                                            disabled={isSlotDisabled || isSlotBlocked}
                                            className={cn(
                                                "h-10 rounded-lg text-sm font-bold transition-all border-2 relative",
                                                selectedSlotId === slot.id
                                                    ? "border-duagon-blue bg-blue-50 text-duagon-blue"
                                                    : slot.componentId && !isPsuSlot
                                                        ? "border-green-200 bg-green-50 text-green-700"
                                                        : isSlotBlocked
                                                            ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                                                            : isPsuSlot
                                                                ? "border-orange-200 bg-orange-50 text-orange-600 cursor-not-allowed"
                                                                : "border-slate-200 hover:border-slate-300 text-slate-600"
                                            )}
                                        >
                                            {slot.id}
                                            {isSlotBlocked && <span className="absolute inset-0 flex items-center justify-center text-xs opacity-50">Link</span>}
                                            {isPsuSlot && <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">PSU</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>



                    {/* Slot Status */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-2 mb-2">
                            <span className={cn(
                                "w-2 h-2 rounded-full",
                                isSystemSlot ? "bg-red-500" : "bg-blue-500"
                            )} />
                            <span className="font-bold text-slate-900">
                                Slot {selectedSlotId} ({isSystemSlot ? 'System' : 'Peripheral'})
                            </span>
                        </div>
                        <p className="text-sm text-slate-500">
                            {isBlocked
                                ? `This slot is blocked by the component in slot ${currentSlot?.blockedBy}.`
                                : currentSlot?.type === 'psu'
                                    ? "This slot is occupied by the Pluggable PSU."
                                    : isSystemSlot
                                        ? "Select a CPU board for the system controller."
                                        : "Select a peripheral card (Storage, Network, I/O)."
                            }
                        </p>
                    </div>

                    {/* Internal Interfaces Tile */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">Internal Interfaces</h2>
                        {hasCpuSelected ? (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    {Object.entries(getRemainingInterfaces(useConfigStore.getState())).map(([key, val]) => (
                                        <div key={key} className={cn(
                                            "p-3 rounded-lg border flex flex-col",
                                            val < 0 ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-100"
                                        )}>
                                            <span className="text-xs uppercase text-slate-500 font-semibold mb-1">{key.replace('_', ' ')}</span>
                                            <div className="flex items-end justify-between">
                                                <span className={cn(
                                                    "text-xl font-bold",
                                                    val < 0 ? "text-red-600" : "text-slate-900"
                                                )}>
                                                    {val}
                                                </span>
                                                <span className="text-xs text-slate-400 mb-1">remaining</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {Object.values(getRemainingInterfaces(useConfigStore.getState())).some(v => v < 0) && (
                                    <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
                                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                        <p>Warning: Interface capacity exceeded. Some components may not function correctly.</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                <p>Select a CPU to view available interfaces.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Component List */}
                <div className="lg:col-span-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 min-h-[600px]">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900">Available Components</h2>

                            {/* Filter Tabs (Simplified) */}
                            {!isSystemSlot && (
                                <div className="flex gap-2">
                                    {['All', 'Storage', 'Network', 'I/O', 'Miscellaneous'].map(filter => (
                                        <button
                                            key={filter}
                                            onClick={() => setCategoryFilter(filter)}
                                            className={cn(
                                                "px-3 py-1 text-sm font-medium rounded-md transition-colors",
                                                categoryFilter === filter
                                                    ? "bg-blue-100 text-blue-700"
                                                    : "text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                                            )}
                                        >
                                            {filter}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {availableProducts.map(product => (
                                <ComponentCard
                                    key={product.id}
                                    product={product}
                                    isSelected={currentSlot?.componentId === product.id}
                                    onSelect={() => handleSelectProduct(product)}
                                    onViewDetails={() => setViewingProduct(product)}
                                    forbidden={isProhibited(product)}
                                    selectedOptions={currentSlot?.componentId === product.id ? currentSlot?.selectedOptions : undefined}
                                />
                            ))}
                        </div>

                    </div>

                    {(isBlocked || (selectedSlotId && selectedSlotId > availableSlotCount)) && (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                            <AlertCircle size={48} className="mb-4 opacity-50" />
                            <p>{isBlocked ? "Slot Blocked" : "Slot Occupied by PSU"}</p>
                        </div>
                    )}

                    {availableProducts.length === 0 && !isBlocked && !(selectedSlotId && selectedSlotId > availableSlotCount) && (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                            <AlertCircle size={48} className="mb-4 opacity-50" />
                            <p>No compatible components found for this slot.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
