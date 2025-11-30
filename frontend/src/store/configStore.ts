
import { create } from 'zustand';

export type SystemSlotPosition = 'left' | 'right';

export interface Slot {
    id: number;
    type: 'system' | 'peripheral';
    componentId: string | null;
    selectedOptions?: Record<string, any>;
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
                componentId: existingSlot ? existingSlot.componentId : null
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

            return { ...slot, type, componentId, selectedOptions: slot.type !== type ? {} : slot.selectedOptions };
        });
        return { systemSlotPosition: position, slots: newSlots };
    }),

    setSlotComponent: (slotId, componentId) => set((state) => ({
        slots: state.slots.map((slot) =>
            slot.id === slotId ? { ...slot, componentId, selectedOptions: {} } : slot
        ),
    })),

    setSlotOptions: (slotId, options) => set((state) => ({
        slots: state.slots.map((slot) =>
            slot.id === slotId ? { ...slot, selectedOptions: options } : slot
        ),
    })),

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

