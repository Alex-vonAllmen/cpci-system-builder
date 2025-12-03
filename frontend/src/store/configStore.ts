
import { create } from 'zustand';

export type SystemSlotPosition = 'left' | 'right';

export interface Slot {
    id: number;
    type: 'system' | 'peripheral' | 'psu';
    componentId: string | null;
    selectedOptions?: Record<string, any>;
    width: number; // Effective width in HP
    blockedBy: number | null; // ID of the slot that blocks this one
}

interface ConfigState {
    slotCount: number;
    systemSlotPosition: SystemSlotPosition;
    slots: Slot[];
    chassisId: string | null;
    chassisOptions: Record<string, any>;
    psuId: string | null;
    psuOptions: Record<string, any>;
    products: any[];
    rules: any[];

    setSlotCount: (count: number) => void;
    setSystemSlotPosition: (position: SystemSlotPosition) => void;
    setSlotComponent: (slotId: number, componentId: string | null) => void;
    setSlotOptions: (slotId: number, options: Record<string, any>) => void;
    setChassis: (chassisId: string | null, options?: Record<string, any>) => void;
    setPsu: (psuId: string | null, options?: Record<string, any>) => void;
    fetchProducts: () => Promise<void>;
    resetConfig: () => void;
    examples: any[];
    fetchExamples: () => Promise<void>;
    importConfig: (config: any) => void;
    validateRules: (state: any) => string[];
    getRemainingInterfaces: (state: any) => Record<string, number>;
}

export const useConfigStore = create<ConfigState>((set) => ({
    slotCount: 21, // Default to 21 slots (84HP)
    systemSlotPosition: 'left', // Default to left
    chassisId: null,
    chassisOptions: {},
    psuId: null,
    psuOptions: {},
    slots: Array.from({ length: 21 }, (_, i) => ({
        id: i + 1,
        type: i === 0 ? 'system' : 'peripheral',
        componentId: null,
        width: 4,
        blockedBy: null,
    })),

    setSlotCount: (count) => set((state) => {
        // Re-generate slots when count changes, preserving existing selections if possible?
        // For now, let's just resize the array and keep data where indices match
        const newSlots = Array.from({ length: count }, (_, i) => {
            const existingSlot = state.slots[i];
            // Determine type based on new position logic if needed, but for now:
            // If system slot is left, slot 1 (index 0) is system.
            // If system slot is right, slot N (index count-1) is system.

            let type: 'system' | 'peripheral' = 'peripheral';
            if (state.systemSlotPosition === 'left' && i === 0) type = 'system';
            if (state.systemSlotPosition === 'right' && i === count - 1) type = 'system';

            return {
                id: i + 1,
                type,
                componentId: existingSlot ? existingSlot.componentId : null,
                width: 4,
                blockedBy: null
            };
        });

        return { slotCount: count, slots: newSlots };
    }),

    setSystemSlotPosition: (position) => set((state) => {
        const newSlots = state.slots.map((slot, index) => {
            let type: 'system' | 'peripheral' = 'peripheral';
            if (position === 'left' && index === 0) type = 'system';
            if (position === 'right' && index === state.slotCount - 1) type = 'system';

            // If type changes, clear the component to avoid invalid configurations
            const componentId = slot.type !== type ? null : slot.componentId;

            return { ...slot, type, componentId, selectedOptions: slot.type !== type ? {} : slot.selectedOptions, blockedBy: null, width: 4 };
        });
        return { systemSlotPosition: position, slots: newSlots };
    }),

    setSlotComponent: (slotId, componentId) => set((state) => {
        // 1. Find component and calculate width
        const product = state.products.find(p => p.id === componentId);
        let width = product ? (product.width_hp || 4) : 4;

        // If unselecting (componentId is null), reset width to 4 and clear blocking
        if (!componentId) {
            // Clear this slot
            const newSlots = state.slots.map(s => {
                if (s.id === slotId) return { ...s, componentId: null, selectedOptions: {}, width: 4, blockedBy: null };
                if (s.blockedBy === slotId) return { ...s, blockedBy: null }; // Unblock neighbors
                return s;
            });
            return { slots: newSlots };
        }

        // 2. Check if we have enough space
        // Calculate required slots (assuming 4HP per slot)
        const slotsNeeded = Math.ceil(width / 4);

        // Check if subsequent slots are available (or already blocked by THIS slot, which is fine if we are just updating)
        // But here we are setting a NEW component.

        // We need to check slots from slotId to slotId + slotsNeeded - 1
        // They must be either empty, or occupied by THIS slot (if we are replacing?), or blocked by THIS slot.
        // Actually, simpler: Check if they are free or blocked by *other* slots.

        // However, `setSlotComponent` implies we are putting a component here.
        // We should clear any existing blocking from this slot first.

        let valid = true;
        for (let i = 0; i < slotsNeeded; i++) {
            const targetId = slotId + i;
            const targetSlot = state.slots.find(s => s.id === targetId);
            if (!targetSlot) { valid = false; break; } // Out of bounds

            // If it's the first slot (the one we are setting), it's fine (we are overwriting it)
            if (i === 0) continue;

            // For other slots, they must be empty or blocked by US (if we are re-selecting).
            // But since we are setting a component, let's assume we want them to be effectively "available".
            if (targetSlot.componentId && targetSlot.blockedBy !== slotId) { valid = false; break; }
            if (targetSlot.blockedBy && targetSlot.blockedBy !== slotId) { valid = false; break; }
        }

        if (!valid) {
            // TODO: Notify user? For now just don't set it or maybe set it but it will look broken?
            // Better to return state as is if invalid?
            // The UI should prevent this, but store should be safe.
            console.warn("Not enough space for component");
            return state;
        }

        const newSlots = state.slots.map(s => {
            // The main slot
            if (s.id === slotId) {
                return { ...s, componentId, selectedOptions: {}, width, blockedBy: null };
            }
            // The blocked slots
            if (s.id > slotId && s.id < slotId + slotsNeeded) {
                return { ...s, componentId: null, selectedOptions: {}, width: 4, blockedBy: slotId };
            }
            // If this slot WAS blocked by slotId but is no longer needed (e.g. component shrunk), unblock it
            if (s.blockedBy === slotId && s.id >= slotId + slotsNeeded) {
                return { ...s, blockedBy: null };
            }
            return s;
        });

        return { slots: newSlots };
    }),

    setSlotOptions: (slotId, options) => set((state) => {
        const slot = state.slots.find(s => s.id === slotId);
        if (!slot || !slot.componentId) return state;

        const product = state.products.find(p => p.id === slot.componentId);
        if (!product) return state;

        // Calculate new width based on options
        let width = product.width_hp || 4;
        if (product.options) {
            product.options.forEach((opt: any) => {
                const selectedValue = options[opt.id];
                if (selectedValue) {
                    const choice = opt.choices?.find((c: any) => c.value === selectedValue);
                    if (choice && choice.widthMod) {
                        width += choice.widthMod;
                    }
                }
            });
        }

        const slotsNeeded = Math.ceil(width / 4);

        // Check validity (similar to setSlotComponent)
        let valid = true;
        for (let i = 1; i < slotsNeeded; i++) {
            const targetId = slotId + i;
            const targetSlot = state.slots.find(s => s.id === targetId);
            if (!targetSlot) { valid = false; break; }
            if (targetSlot.componentId && targetSlot.blockedBy !== slotId) { valid = false; break; }
            if (targetSlot.blockedBy && targetSlot.blockedBy !== slotId) { valid = false; break; }
        }

        if (!valid) {
            console.warn("Options increase width too much");
            // Maybe we should still allow setting options but show error? 
            // For now, let's allow it but it might overlap? No, better to block.
            // Or better: The UI should have checked this.
            return state;
        }

        const newSlots = state.slots.map(s => {
            if (s.id === slotId) {
                return { ...s, selectedOptions: options, width };
            }
            // The blocked slots
            if (s.id > slotId && s.id < slotId + slotsNeeded) {
                return { ...s, componentId: null, selectedOptions: {}, width: 4, blockedBy: slotId };
            }
            // Unblock if shrunk
            if (s.blockedBy === slotId && s.id >= slotId + slotsNeeded) {
                return { ...s, blockedBy: null };
            }
            return s;
        });

        return { slots: newSlots };
    }),

    setChassis: (chassisId, options = {}) => set({ chassisId, chassisOptions: options }),
    setPsu: (psuId, options = {}) => set((state) => {
        const { slots, products, slotCount } = state;
        let newSlots = [...slots];

        // 1. Remove existing pluggable PSU if any
        // Check if any slot has type 'psu'
        const existingPsuSlotIndex = newSlots.findIndex(s => s.type === 'psu');
        if (existingPsuSlotIndex !== -1) {
            // Find how many slots it occupied
            const psuSlots = newSlots.filter(s => s.type === 'psu');
            const shiftAmount = psuSlots.length;

            // Remove PSU slots and shift everything left
            // Actually, we just want to remove the 'psu' slots and pull everything back.
            // The 'psu' slots are at the beginning (left).
            // So we take the slots AFTER the psu slots, and move them to the beginning.
            // Then we fill the end with empty peripheral slots.

            const contentSlots = newSlots.slice(shiftAmount);
            const emptySlots = Array.from({ length: shiftAmount }, (_, i) => ({
                id: 0, // temp
                type: 'peripheral' as const,
                componentId: null,
                width: 4,
                blockedBy: null
            }));

            newSlots = [...contentSlots, ...emptySlots];
            // Re-assign IDs and types
            newSlots = newSlots.map((s, i) => ({
                ...s,
                id: i + 1,
                type: (state.systemSlotPosition === 'left' && i === 0) || (state.systemSlotPosition === 'right' && i === slotCount - 1) ? 'system' : 'peripheral'
            }));
        }

        // 2. If setting a new PSU
        if (psuId) {
            const psu = products.find(p => p.id === psuId);
            // Check if pluggable (has width defined and maybe type 'psu', assuming all PSUs in list are 'psu' type)
            // User said "only if it's a pluggable 3U PSU".
            // We can check if width_hp > 0.
            if (psu && psu.width_hp && psu.width_hp > 0) {
                const slotsNeeded = Math.ceil(psu.width_hp / 4);

                // Check if we can shift right
                // We need 'slotsNeeded' empty slots at the end (or we push components out).
                // User said: "it must be ensured that the shifting doesn't lead to components being shifted out".
                // So we check the last 'slotsNeeded' slots. If they are occupied, we abort.
                const lastSlots = newSlots.slice(-slotsNeeded);
                const hasContent = lastSlots.some(s => s.componentId !== null);

                if (hasContent) {
                    console.warn("Cannot add PSU: Components would be pushed out of chassis.");
                    // TODO: Notify user via toast or return error?
                    // For now, we just don't apply the change.
                    // But we might have already removed the old PSU! 
                    // If we removed the old PSU, we should probably revert that?
                    // Or maybe we treat "Change PSU" as atomic.
                    // If we fail to add new one, we should probably keep the old one.
                    // But here we already modified 'newSlots'.
                    // So we should return 'state' (no change).
                    return state;
                }

                // Shift right
                // Take the first (N - slotsNeeded) slots
                const shiftContent = newSlots.slice(0, slotCount - slotsNeeded);

                // Create PSU slots
                const psuSlots = Array.from({ length: slotsNeeded }, (_, i) => ({
                    id: i + 1,
                    type: 'psu' as const,
                    componentId: psuId,
                    width: i === 0 ? psu.width_hp : 4, // Set width on first slot?
                    blockedBy: i === 0 ? null : 1, // Blocked by first slot
                    selectedOptions: options
                }));

                // Combine
                newSlots = [...psuSlots, ...shiftContent];

                // Re-assign IDs
                newSlots = newSlots.map((s, i) => ({
                    ...s,
                    id: i + 1,
                    // blockedBy needs adjustment if we shifted?
                    // If a component was blocked by slot X, it is now blocked by slot X + slotsNeeded.
                    blockedBy: s.type === 'psu' ? (i === 0 ? null : 1) : (s.blockedBy ? s.blockedBy + slotsNeeded : null)
                }));
            }
        }

        return { psuId, psuOptions: options, slots: newSlots };
    }),

    products: [],
    fetchProducts: async () => {
        try {
            // Import api dynamically to avoid circular dependency if api imports store (unlikely but safe)
            // Or just import at top if safe. Let's import at top.
            const { api } = await import('../services/api');
            const products = await api.products.list();
            set({ products });

            // Also fetch rules
            const rules = await api.rules.list();
            set({ rules });
        } catch (error) {
            console.error("Failed to fetch products/rules", error);
        }
    },

    resetConfig: () => set((state) => ({
        slotCount: 21,
        systemSlotPosition: 'left',
        chassisId: null,
        chassisOptions: {},
        psuId: null,
        psuOptions: {},
        slots: Array.from({ length: 21 }, (_, i) => ({
            id: i + 1,
            type: i === 0 ? 'system' : 'peripheral',
            componentId: null,
            width: 4,
            blockedBy: null,
        })),
    })),

    rules: [],

    examples: [],
    fetchExamples: async () => {
        try {
            const { api } = await import('../services/api');
            const response = await api.examples.list();
            set({ examples: response });
        } catch (error) {
            console.error('Failed to fetch examples:', error);
        }
    },

    importConfig: (config: any) => set((state) => {
        // Validate config structure roughly?
        if (!config || !config.slots) {
            console.error("Invalid config object");
            return state;
        }

        return {
            ...state,
            slotCount: config.slotCount || 21,
            systemSlotPosition: config.systemSlotPosition || 'left',
            chassisId: config.chassisId || null,
            chassisOptions: config.chassisOptions || {},
            psuId: config.psuId || null,
            psuOptions: config.psuOptions || {},
            slots: config.slots || [],
        };
    }),

    getRemainingInterfaces: (state: any) => {
        const { slots, products } = state;
        const remaining: Record<string, number> = {};

        // Find System Slot (CPU)
        const systemSlot = slots.find((s: any) => s.type === 'system');
        if (!systemSlot || !systemSlot.componentId) return remaining;

        const cpu = products.find((p: any) => p.id === systemSlot.componentId);
        if (!cpu || !cpu.interfaces) return remaining;

        // Initialize with CPU capacity
        Object.entries(cpu.interfaces).forEach(([key, val]) => {
            remaining[key] = Number(val);
        });

        // Subtract peripheral consumption
        slots.forEach((slot: any) => {
            if (slot.type === 'peripheral' && slot.componentId && !slot.blockedBy) {
                const p = products.find((prod: any) => prod.id === slot.componentId);
                if (p && p.interfaces) {
                    Object.entries(p.interfaces).forEach(([key, val]) => {
                        if (remaining[key] !== undefined) {
                            remaining[key] -= Number(val);
                        }
                    });
                }
            }
        });

        return remaining;
    },

    validateRules: (proposedState) => {
        const { rules, slots, chassisId, psuId, slotCount, products } = proposedState;
        const violations: string[] = [];

        // --- Interface Validation ---
        // We can reuse the logic from getRemainingInterfaces but we need to run it on proposedState
        // Since getRemainingInterfaces is a store function, we can't call it easily on a plain object unless we extract the logic.
        // Let's inline the logic or extract a helper outside the store.

        const remaining: Record<string, number> = {};
        const systemSlot = slots.find((s: any) => s.type === 'system');
        if (systemSlot && systemSlot.componentId) {
            const cpu = products.find((p: any) => p.id === systemSlot.componentId);
            if (cpu && cpu.interfaces) {
                Object.entries(cpu.interfaces).forEach(([key, val]) => {
                    remaining[key] = Number(val);
                });

                slots.forEach((slot: any) => {
                    if (slot.type === 'peripheral' && slot.componentId && !slot.blockedBy) {
                        const p = products.find((prod: any) => prod.id === slot.componentId);
                        if (p && p.interfaces) {
                            Object.entries(p.interfaces).forEach(([key, val]) => {
                                if (remaining[key] !== undefined) {
                                    remaining[key] -= Number(val);
                                }
                            });
                        }
                    }
                });

                // Check for negative values
                Object.entries(remaining).forEach(([key, val]) => {
                    if (val < 0) {
                        violations.push(`Insufficient ${key} interfaces. (Overrun by ${Math.abs(val)})`);
                    }
                });
            }
        }

        // Calculate Widths
        const backplaneWidth = slotCount * 4; // Total capacity of the backplane

        // ... (rest of existing validation logic)

        // Calculate Used Width (Components + PSU)
        let usedWidth = 0;

        // Sum component widths
        slots.forEach((slot: any) => {
            if (slot.componentId) {
                const product = products.find((p: any) => p.id === slot.componentId);
                if (product) {
                    let w = product.width_hp || 4;
                    // Add option widths if any
                    if (slot.selectedOptions && product.options) {
                        product.options.forEach((opt: any) => {
                            const val = slot.selectedOptions[opt.id];
                            if (val) {
                                const choice = opt.choices?.find((c: any) => c.value === val);
                                if (choice && choice.widthMod) w += choice.widthMod;
                            }
                        });
                    }
                    usedWidth += w;
                } else {
                    usedWidth += 4; // Default if product not found but ID exists?
                }
            }
        });

        let psuWidth = 0;
        if (psuId) {
            // Only add PSU width if it's NOT already in the slots (i.e. not pluggable/shifted)
            const isPluggable = slots.some((s: any) => s.type === 'psu' && s.componentId === psuId);
            if (!isPluggable) {
                const psu = products.find((p: any) => p.id === psuId);
                if (psu) psuWidth = psu.width_hp || 0;
            }
        }
        usedWidth += psuWidth;

        // 0. Global Limit Check (Used Width)
        if (usedWidth > 84) {
            violations.push(`Configuration used width (${usedWidth}HP) exceeds the maximum system limit of 84HP.`);
        }
        // Also check backplane limit just in case
        if (backplaneWidth > 84) {
            violations.push(`Backplane size (${backplaneWidth}HP) exceeds the maximum system limit of 84HP.`);
        }

        // 1. Check Backplane vs Chassis Width
        if (chassisId) {
            const chassis = products.find((p: any) => p.id === chassisId);
            if (chassis && chassis.width_hp) {
                // Check if backplane fits in chassis
                if (backplaneWidth > chassis.width_hp) {
                    violations.push(`Backplane size (${backplaneWidth}HP) exceeds chassis capacity (${chassis.width_hp}HP).`);
                }

                // Check if used width fits in backplane (and thus chassis)
                // Actually, used width must fit in the available slots.
                // But simplified: Used Width <= Backplane Width
                if (usedWidth > backplaneWidth) {
                    violations.push(`Total used width (${usedWidth}HP) exceeds backplane capacity (${backplaneWidth}HP).`);
                }
            }
        }

        // Map totalWidth to usedWidth for rules
        const totalWidth = usedWidth;

        rules.forEach((rule: any) => {
            const def = rule.definition;
            if (!def || !def.conditions || !def.actions) return;

            // Check conditions
            const conditionsMet = def.conditions.every((cond: any) => {
                if (cond.type === 'component_selected') {
                    if (cond.slotIndex) {
                        const slot = slots.find((s: any) => s.id === cond.slotIndex);
                        return slot && slot.componentId === cond.componentId;
                    } else {
                        return slots.some((s: any) => s.componentId === cond.componentId);
                    }
                } else if (cond.type === 'system_property') {
                    if (cond.property === 'slotCount') {
                        if (cond.operator === 'gt') return slotCount > cond.value;
                        if (cond.operator === 'lt') return slotCount < cond.value;
                        if (cond.operator === 'eq') return slotCount === cond.value;
                    }
                    if (cond.property === 'totalWidth') {
                        if (cond.operator === 'gt') return totalWidth > cond.value;
                        if (cond.operator === 'lt') return totalWidth < cond.value;
                        if (cond.operator === 'eq') return totalWidth === cond.value;
                    }
                    if (cond.property === 'chassisId') {
                        if (cond.operator === 'eq') return chassisId === cond.value;
                        if (cond.operator === 'contains' && chassisId) return chassisId.includes(cond.value);
                    }
                }
                return false;
            });

            if (conditionsMet) {
                def.actions.forEach((action: any) => {
                    if (action.type === 'forbid') {
                        if (action.componentId) {
                            if (action.slotIndex) {
                                const slot = slots.find((s: any) => s.id === action.slotIndex);
                                if (slot && slot.componentId === action.componentId) {
                                    violations.push(action.message || rule.description);
                                }
                            } else {
                                if (slots.some((s: any) => s.componentId === action.componentId)) {
                                    violations.push(action.message || rule.description);
                                }
                                if (chassisId === action.componentId) violations.push(action.message || rule.description);
                                if (psuId === action.componentId) violations.push(action.message || rule.description);
                            }
                        }
                    }
                });
            }
        });

        return violations;
    }
}));

