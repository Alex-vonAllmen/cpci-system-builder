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
    const toast = useToast();
    const { slots, setSlotComponent, setSlotOptions, products, fetchProducts, validateRules, getRemainingInterfaces, getSlotInterfaces } = useConfigStore();
    const [selectedSlotId, setSelectedSlotId] = useState<number | null>(() => {
        const sysSlot = useConfigStore.getState().slots.find(s => s.type === 'system');
        return sysSlot ? sysSlot.id : 1;
    });

    // Derived state
    const currentSlot = selectedSlotId ? slots.find(s => s.id === selectedSlotId) : null;
    const isSystemSlot = currentSlot?.type === 'system';
    const isBlocked = !!currentSlot?.blockedBy;

    const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
    const [configuringProduct, setConfiguringProduct] = useState<Product | null>(null);
    const [isEditingExisting, setIsEditingExisting] = useState(false);
    const [tempOptions, setTempOptions] = useState<any>({});

    const [categoryFilter, setCategoryFilter] = useState<string>('All');

    // Load products on mount
    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);



    const providedInterfaces = selectedSlotId ? getSlotInterfaces(selectedSlotId) : null;

    // Helper: Check compatibility and return reason if incompatible
    const checkCompatibility = (p: Product, interfaces: any): { compatible: boolean, reason?: string, missing?: string[] } => {
        if (isSystemSlot) {
            return p.type === 'cpu'
                ? { compatible: true }
                : { compatible: false, reason: "Only CPU boards can be placed in the System Slot." };
        }

        if (p.type === 'cpu') {
            return { compatible: false, reason: "CPU boards can only be placed in the System Slot (Slot 1)." };
        }

        if (currentSlot?.type === 'psu') return { compatible: false, reason: "Slot reserved for PSU." };

        // Category Filter logic (still strict hiding? No, user said "show all available components but grey out incompatible")
        // But "available" usually implies category filter is active. 
        // Let's assume Category Filter limits the VIEW, but Compatibility dims items WITHIN that view.
        // So we keep category filtering as HARD filter for UX cleanliness (user selected a tab), 
        // but Interface Compatibility as SOFT filter (dimming).

        if (p.requiredInterfaces && Object.keys(p.requiredInterfaces).length > 0) {
            if (!interfaces) return { compatible: false, reason: "Slot has no bus connection to System Slot." };

            const missing: string[] = [];
            for (const [connector, requiredList] of Object.entries(p.requiredInterfaces)) {
                const providedList = interfaces[connector];
                if (!providedList) {
                    missing.push(`${connector} (Not present)`);
                    continue;
                }
                const missingIntfs = (requiredList as string[]).filter(req => !providedList.includes(req));
                if (missingIntfs.length > 0) {
                    missing.push(`${connector}: ${missingIntfs.join(', ')}`);
                }
            }

            if (missing.length > 0) {
                return { compatible: false, reason: "Missing required interfaces:", missing };
            }
        }

        return { compatible: true };
    };

    // Helper to check if a product is forbidden for the current slot
    function isProhibited(product: Product) {
        if (!currentSlot) return false;
        const proposedState = {
            ...useConfigStore.getState(),
            slots: slots.map(s => s.id === currentSlot.id ? { ...s, componentId: product.id } : s)
        };
        // Ignore chassis compliance rules (like Fan Tray) during component selection
        return validateRules(proposedState, { ignoreCategories: ['chassis_compliance'] }).length > 0;
    }

    // Helper to get rule violation reason (duplicated logic slightly from isProhibited but we need msg)
    function prohibitReason(product: Product) {
        if (!currentSlot) return null;
        const proposedState = {
            ...useConfigStore.getState(),
            slots: slots.map(s => s.id === currentSlot.id ? { ...s, componentId: product.id } : s)
        };
        const violations = validateRules(proposedState, { ignoreCategories: ['chassis_compliance'] });
        return violations.length > 0 ? violations[0] : null;
    }

    // Filter products based on slot type and category
    // We Map products to include compatibility info
    const visibleProducts = products
        .filter((p: Product) => {
            // 1. Basic Type Hygiene (Keep this strict to avoid clutter? Or show all?)
            // Showing Chassis products in slot selection is wrong.
            if (['chassis', 'psu'].includes(p.type)) return false;

            // 2. System Slot Rules
            if (isSystemSlot) {
                // System slot: Show ONLY CPUs
                return p.type === 'cpu';
            } else {
                // Peripheral slot: Show everything EXCEPT CPUs
                if (p.type === 'cpu') return false;
            }

            // 3. Category Filter (Keep strict as it helps user find things)
            if (categoryFilter !== 'All') {
                if (categoryFilter === 'Storage' && p.type !== 'storage') return false;
                if (categoryFilter === 'Network' && p.type !== 'network') return false;
                if (categoryFilter === 'I/O' && p.type !== 'io') return false;
                if (categoryFilter === 'Miscellaneous' && p.type !== 'miscellaneous') return false;
            }
            return true;
        })
        .map(p => {
            const { compatible, reason, missing } = checkCompatibility(p, providedInterfaces);
            // Also check 'isProhibited' (Rule Engine)
            const prohibited = isProhibited(p);

            return {
                ...p,
                isCompatible: compatible && !prohibited,
                incompatibilityReason: prohibitReason(p) || reason, // Prioritize rule reason? Helper above returns bool.
                missingInterfaces: missing
            };
        });

    const handleSlotClick = (slotId: number) => {
        const slot = slots.find(s => s.id === slotId);
        if (!slot) return;
        if (slot.blockedBy) return;
        if (slot.type === 'psu') return; // PSU handling elsewhere or disabled

        // WARN if navigating away from System Slot without CPU
        // Check if CPU is selected
        const cpuSlot = slots.find(s => s.type === 'system');
        const hasCpu = !!cpuSlot?.componentId;

        if (slot.type === 'peripheral' && !hasCpu) {
            toast.error("Please select a System CPU first to determine available interfaces for peripheral slots.");
            // We allow navigation but the warning is shown. 
            // Or should we block? User said "Show a warning...". 
            // Often implied as "don't forbid but warn". 
            // But without CPU, interface compatibility is unknown (null).
            // So everything will be incompatible.
        }

        setSelectedSlotId(slotId);
    };

    const handleSelectProduct = (product: Product & { isCompatible?: boolean, incompatibilityReason?: string, missingInterfaces?: string[] }) => {
        if (selectedSlotId === null) return;
        if (currentSlot?.type === 'psu') return;

        // Compatibility Check
        if (product.isCompatible === false) {
            // Find compatible slots
            const compatibleSlots = slots.filter(s => {
                if (s.type === 'system' || s.type === 'psu' || s.blockedBy) return false;
                // Check interfaces for this slot
                const intfs = getSlotInterfaces(s.id);
                return checkCompatibility(product, intfs).compatible;
            });

            const slotList = compatibleSlots.length > 0
                ? compatibleSlots.map(s => `Slot ${s.id}`).join(', ')
                : "None available";

            const reasonMsg = product.incompatibilityReason
                ? `${product.incompatibilityReason}`
                : "Unknown incompatibility";

            const detailMsg = product.missingInterfaces && product.missingInterfaces.length > 0
                ? `\nMissing: ${product.missingInterfaces.join(', ')}`
                : "";

            toast.error(`Incompatible Component\n${reasonMsg}${detailMsg}\n\nCompatible Slots: ${slotList}`);
            return;
        }

        const isAlreadySelected = currentSlot?.componentId === product.id;

        if (isAlreadySelected) {
            // Edit existing component
            setConfiguringProduct(product);
            setIsEditingExisting(true);
            setTempOptions(currentSlot?.selectedOptions || {});
            return;
        }

        if (product.options && product.options.length > 0) {
            setConfiguringProduct(product);
            setIsEditingExisting(false);
            const defaults: Record<string, any> = {};
            product.options.forEach(opt => {
                defaults[opt.id] = opt.default;
            });
            setTempOptions(defaults);
        } else {
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
                onRemove={isEditingExisting ? () => {
                    if (selectedSlotId) setSlotComponent(selectedSlotId, null);
                    setConfiguringProduct(null);
                } : undefined}
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
                                            onClick={() => !isSlotDisabled && !isSlotBlocked && handleSlotClick(slot.id)}
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
                                        : !providedInterfaces
                                            ? "No bus connection available at this slot. Only passive components allowed."
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
                            {visibleProducts.map(product => (
                                <ComponentCard
                                    key={product.id}
                                    product={product}
                                    isSelected={currentSlot?.componentId === product.id}
                                    onSelect={() => handleSelectProduct(product)}
                                    onViewDetails={() => setViewingProduct(product)}
                                    incompatible={!product.isCompatible}
                                    forbidden={isProhibited(product)} // Kept for legacy rule engine, but isCompatible covers most now? 
                                    // Actually isProhibited logic is now folded into isCompatible, but pass explicit forbidden if needed visually?
                                    // Let's rely on incompatible prop for dimming.
                                    selectedOptions={currentSlot?.componentId === product.id ? currentSlot?.selectedOptions : undefined}
                                />
                            ))}
                        </div>

                    </div>

                    {(isBlocked) && (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                            <AlertCircle size={48} className="mb-4 opacity-50" />
                            <p>Slot Blocked</p>
                        </div>
                    )}

                    {visibleProducts.length === 0 && !isBlocked && (
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
