
import { create } from 'zustand';

export type SystemSlotPosition = 'left' | 'right';

export interface Slot {
    id: number;
    type: 'system' | 'peripheral';
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
    validateRules: (state: any) => string[];
}

export const useConfigStore = create<ConfigState>((set) => ({
    slotCount: 9, // Default to 9 slots
    systemSlotPosition: 'left', // Default to left
    chassisId: null,
    chassisOptions: {},
    psuId: null,
    psuOptions: {},
    slots: Array.from({ length: 9 }, (_, i) => ({
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
    setPsu: (psuId, options = {}) => set({ psuId, psuOptions: options }),

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
        slotCount: 9,
        systemSlotPosition: 'left',
        chassisId: null,
        chassisOptions: {},
        psuId: null,
        psuOptions: {},
        slots: Array.from({ length: 9 }, (_, i) => ({
            id: i + 1,
            type: i === 0 ? 'system' : 'peripheral',
            componentId: null,
            width: 4,
            blockedBy: null,
        })),
    })),

    rules: [],

    validateRules: (proposedState) => {
        const { rules, slots, chassisId, psuId, slotCount } = proposedState;
        const violations: string[] = [];

        rules.forEach((rule: any) => {
            const def = rule.definition;
            if (!def || !def.conditions || !def.actions) return;

            // Check conditions
            // Logic: If ALL conditions match (AND), then apply actions
            // TODO: Support OR logic if needed, currently assuming AND

            const conditionsMet = def.conditions.every((cond: any) => {
                if (cond.type === 'component_selected') {
                    // Check if component is in specific slot or any slot
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
                    if (cond.property === 'chassisId') {
                        if (cond.operator === 'eq') return chassisId === cond.value;
                        // Helper for partial match (e.g. "contains")
                        if (cond.operator === 'contains' && chassisId) return chassisId.includes(cond.value);
                    }
                }
                return false;
            });

            if (conditionsMet) {
                // Apply actions (check for violations)
                def.actions.forEach((action: any) => {
                    if (action.type === 'forbid') {
                        // Check if forbidden state exists
                        if (action.componentId) {
                            // Check if forbidden component is selected
                            if (action.slotIndex) {
                                const slot = slots.find((s: any) => s.id === action.slotIndex);
                                if (slot && slot.componentId === action.componentId) {
                                    violations.push(action.message || rule.description);
                                }
                            } else {
                                if (slots.some((s: any) => s.componentId === action.componentId)) {
                                    violations.push(action.message || rule.description);
                                }
                                // Also check chassis/psu if componentId matches them
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

