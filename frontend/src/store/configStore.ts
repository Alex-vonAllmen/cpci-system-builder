
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
    articles: any[];

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
    validateRules: (state?: any, options?: { ignoreCategories?: string[] }) => string[];
    getRemainingInterfaces: (state: any) => Record<string, number>;
}

export const useConfigStore = create<ConfigState>((set, get) => ({
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
        // 1. Create base new slots array, preserving data where possible
        let newSlots: Slot[] = [];
        const oldSlots = state.slots;
        const oldCount = oldSlots.length;

        if (state.systemSlotPosition === 'left') {
            // STRICT PRESERVATION STRATEGY
            // If Left-aligned, we assume extension happens at the end (peripherals).
            // We strictly copy existing slots to preserve shifted System Slots (e.g. PSU effects).

            for (let i = 0; i < count; i++) {
                if (i < oldCount) {
                    // Copy existing slot
                    // Reset blockedBy to null so we can cleanly recalculate it based on components
                    newSlots.push({ ...oldSlots[i], blockedBy: null });
                } else {
                    // New slot (always peripheral in left-add-to-end mode)
                    newSlots.push({
                        id: i + 1,
                        type: 'peripheral',
                        componentId: null,
                        width: 4,
                        blockedBy: null
                    });
                }
            }
        } else {
            // Right alignment or other future modes
            // Use standard regeneration logic for now
            newSlots = Array.from({ length: count }, (_, i) => {
                const existingSlot = i < oldSlots.length ? oldSlots[i] : null;

                // Determine type
                let type: 'system' | 'peripheral' | 'psu' = 'peripheral';
                // if (state.systemSlotPosition === 'left' && i === 0) type = 'system'; // Handled in if-block above
                if (state.systemSlotPosition === 'right' && i === count - 1) type = 'system';

                // Preserve PSU type if existing slot was PSU
                if (existingSlot && existingSlot.type === 'psu') {
                    type = 'psu';
                }

                let componentId = null;
                let selectedOptions = {};

                if (existingSlot) {
                    if (existingSlot.type === type) {
                        componentId = existingSlot.componentId;
                        selectedOptions = existingSlot.selectedOptions || {};
                    }
                }

                return {
                    id: i + 1,
                    type,
                    componentId,
                    selectedOptions,
                    width: 4,
                    blockedBy: null
                };
            });
        }

        // 2. Recalculate Widths and Blocking
        // We need to iterate and apply blocking for any component found
        // Use a loop that allows updated blockedBy on future slots

        for (let i = 0; i < newSlots.length; i++) {
            const slot = newSlots[i];

            // If this slot is already blocked by a previous one, skip (it was handled)
            if (slot.blockedBy !== null) continue;

            if (slot.componentId) {
                // Find product to get width
                const product = state.products.find(p => p.id === slot.componentId);
                if (product) {
                    let width = product.width_hp || 4;

                    // Modify width based on options
                    if (product.options && slot.selectedOptions) {
                        product.options.forEach((opt: any) => {
                            const val = slot.selectedOptions![opt.id];
                            if (val) {
                                const choice = opt.choices?.find((c: any) => c.value === val);
                                if (choice && choice.widthMod) {
                                    width += choice.widthMod;
                                }
                            }
                        });
                    }

                    slot.width = width;

                    // Apply blocking to neighbors
                    const slotsNeeded = Math.ceil(width / 4);
                    if (slotsNeeded > 1) {
                        for (let j = 1; j < slotsNeeded; j++) {
                            const targetIndex = i + j;
                            if (targetIndex < newSlots.length) {
                                newSlots[targetIndex].blockedBy = slot.id;
                                newSlots[targetIndex].componentId = null; // Ensure blocked slot is empty
                                newSlots[targetIndex].selectedOptions = {};
                            }
                        }
                    }
                }
            }
        }

        return { slotCount: count, slots: newSlots };
    }),

    setSystemSlotPosition: (position) => set((state) => {
        const newSlots = state.slots.map((slot, index) => {
            let type: 'system' | 'peripheral' | 'psu' = 'peripheral';
            if (position === 'left' && index === 0) type = 'system';
            if (position === 'right' && index === state.slotCount - 1) type = 'system';

            // Preserve PSU
            if (slot.type === 'psu') {
                type = 'psu';
            }

            // If type changes, clear... except if we consider psu -> psu a change? No.
            // But if position change makes a psu slot into system?
            // If I have PSU in slot 1 (left). And I switch system to right.
            // Slot 1 (Left) was psu.
            // New logic: position 'right'. index 0 is peripheral.
            // But checking 'slot.type === psu' overrides it to 'psu'.
            // So PSU stays. Correct.

            // If I have System in slot 1. Switch to right.
            // index 0 -> peripheral.
            // slot.type was system. Not psu.
            // type becomes peripheral.
            // componentId cleared?

            const componentId = slot.type !== type ? null : slot.componentId;

            return { ...slot, type, componentId, selectedOptions: slot.type !== type ? {} : slot.selectedOptions, blockedBy: null, width: 4 };
        });
        return { systemSlotPosition: position, slots: newSlots };
    }),

    setSlotComponent: (slotId, componentId) => set((state) => {
        // 1. Find component and calculate width
        const product = state.products.find(p => p.id === componentId);
        let width = product ? (product.width_hp || 4) : 4;

        // Special handling for Right-Aligned System Slot
        const isRightAlignedSystem = state.systemSlotPosition === 'right';
        const clickedSlot = state.slots.find(s => s.id === slotId);
        const isSystemOperation = clickedSlot?.type === 'system' || (isRightAlignedSystem && clickedSlot?.id === state.slotCount); // Assuming user clicks the "red" slot which might be shifted or the last one

        // Correct target slot ID logic
        let targetSlotId = slotId;

        // If unselecting (componentId is null)
        if (!componentId) {
            const newSlots = state.slots.map(s => {
                // If this slot was holding a component
                if (s.id === slotId) {
                    // If it was system slot and we are removing it
                    let type: Slot['type'] = s.type;

                    // If we are in Right Aligned mode, and we remove the component, 
                    // we need to reset the system slot indicator to the LAST slot.
                    if (isRightAlignedSystem && type === 'system') {
                        // If this wasn't the last slot (meaning it was shifted left), revert it to peripheral
                        if (s.id !== state.slotCount) {
                            type = 'peripheral';
                        }
                    }
                    return { ...s, componentId: null, selectedOptions: {}, width: 4, blockedBy: null, type };
                }

                // Unblock neighbors
                if (s.blockedBy === slotId) {
                    let type: Slot['type'] = s.type;
                    // If we removed a shifted system slot, and this blocked slot is the LAST slot,
                    // it should regain 'system' status.
                    if (isRightAlignedSystem && s.id === state.slotCount) {
                        type = 'system';
                    }
                    return { ...s, blockedBy: null, type };
                }

                return s;
            });
            return { slots: newSlots };
        }

        // 2. Check if we have enough space
        const slotsNeeded = Math.ceil(width / 4);

        // If Right-Aligned System Slot logic applies:
        // We expand LEFT from the last slot (or current system slot position?)
        // Actually, user clicks the system slot. If it's empty, it's at slotCount.
        // If it's already occupied (e.g. by 4HP), it's at slotCount.
        // If we select 8HP, we want it to occupy slotCount and slotCount-1. Reference slot becomes slotCount-1.

        if (isRightAlignedSystem && isSystemOperation) {
            // We assume the component MUST end at the last slot?
            // "in a half 19-inch rack the CPU should cover slots 9 and 10, with the system slots and the associated connectors at slot 9" 
            // (Assuming 10 slots total).

            // So Effective Start Slot = EndSlot - slotsNeeded + 1.
            // Where EndSlot is the current system slot's RIGHTMOST reach.
            // If we are just adding to the "System Slot" placeholder (which is currently single slot), EndSlot is that slot.

            // Let's assume we align to the far right of the CHASSIS/BACKPLANE.
            const endSlotId = state.slotCount;
            targetSlotId = endSlotId - slotsNeeded + 1;

            // Validate: Range [targetSlotId, endSlotId] must be available (or occupied by current system)
            if (targetSlotId < 1) {
                console.warn("Component too wide for right alignment");
                return state;
            }
        }

        // Standard Validation (using targetSlotId)
        let valid = true;
        for (let i = 0; i < slotsNeeded; i++) {
            const checkId = targetSlotId + i;
            const targetSlot = state.slots.find(s => s.id === checkId);
            if (!targetSlot) { valid = false; break; }

            // If it's the target slot itself, it's fine
            if (i === 0) continue;

            // For other slots:
            // They must be free.
            // EXCEPT if they are currently part of the system slot we are replacing.
            // e.g. replacing 8HP with 12HP.

            // If they are blocked by something ELSE, invalid.
            if (targetSlot.blockedBy && targetSlot.blockedBy !== slotId && targetSlot.blockedBy !== targetSlotId) { valid = false; break; }
            if (targetSlot.componentId && targetSlot.componentId !== componentId && targetSlot.type !== 'system') { valid = false; break; } // Allow overwriting system slot parts

            // If right aligned, we are overwriting peripheral slots which are now becoming system.
            if (targetSlot.componentId && targetSlot.type === 'peripheral') { valid = false; break; }
        }

        if (!valid) {
            console.warn("Not enough space");
            return state;
        }

        const newSlots = state.slots.map(s => {
            // The NEW main slot
            if (s.id === targetSlotId) {
                // If this is right aligned, this becomes 'system' type
                const type = isRightAlignedSystem && isSystemOperation ? 'system' : s.type;
                return { ...s, componentId, selectedOptions: {}, width, blockedBy: null, type };
            }

            // The blocked slots
            if (s.id > targetSlotId && s.id < targetSlotId + slotsNeeded) {
                // For right aligned system, these lose their 'system' status if they had it (e.g. the old slot 21)
                // And become blocked.
                return { ...s, componentId: null, selectedOptions: {}, width: 4, blockedBy: targetSlotId, type: 'peripheral' as const }; // Force to peripheral
            }

            // CLEANUP: 
            // If we moved the system slot left (e.g. 21 -> 20), we need to handle the old slot 21 if it's not covered?
            // Wait, if we shrink:
            // Old was 8HP (20, 21). Main 20.
            // New is 4HP. Target 21.
            // Slot 20 is no longer Main. It should become peripheral. 
            // Slot 21 becomes Main System.

            // This map function iterates all slots.

            // If we are Right Aligned System Operation:
            if (isRightAlignedSystem && isSystemOperation) {
                // If s.id is NOT in the new range [targetSlotId, targetSlotId + slotsNeeded - 1]
                // AND it WAS 'system', we must reset it to 'peripheral'.
                if ((s.id < targetSlotId || s.id >= targetSlotId + slotsNeeded) && s.type === 'system') {
                    // But wait, if we are shrinking, the new system slot is AT THE END.
                    // The start moved RIGHT.
                    // e.g. 20->21.
                    // Slot 20 was system. Now it is outside range. It becomes peripheral.
                    return { ...s, type: 'peripheral' as const, componentId: null, blockedBy: null, width: 4 };
                }
            }

            // For standard blocking cleanup (if component shrank left-aligned)
            if (!isRightAlignedSystem && s.blockedBy === slotId && s.id >= slotId + slotsNeeded) {
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
            const emptySlots = Array.from({ length: shiftAmount }, () => ({
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

                // Logic depends on System Slot Position
                const isRightAligned = state.systemSlotPosition === 'right';

                if (isRightAligned) {
                    // If Right Aligned, we want to INSERT the PSU at the left and SHIFT peripherals right,
                    // BUT we must NOT shift the System Slot (which is anchored at the right).
                    // So we effectively sqeeze the "Peripheral Space".

                    // 1. Find the Barrier (Start of System Slot components)
                    // Scan from right to left to find the first slot that is part of the system slot.
                    // Typically it's slotCount. But if wide CPU (left expanded), it could be less.
                    // Or any slot blocked by the last slot?

                    // Let's find the first slot that is type='system' or blocked by a 'system' slot?
                    // Actually, in right aligned mode, the system slot is the LAST slots.
                    // We can find the minimal index `i` such that all slots `j >= i` are system (or empty placeholders for system?).
                    // Simpler: Find the lowest ID that has type='system' or is blocked by a type='system'.

                    const systemSlotIndex = newSlots.findIndex(s => s.type === 'system' || (s.blockedBy && newSlots.find(b => b.id === s.blockedBy)?.type === 'system'));

                    // If no system slot found (shouldn't happen), assume barrier is at end
                    const barrierIndex = systemSlotIndex === -1 ? slotCount : systemSlotIndex;

                    // The "Movable Zone" is newSlots[0 ... barrierIndex-1]
                    // We want to insert 'slotsNeeded' items at 0.
                    // This pushes items at (barrierIndex - slotsNeeded ... barrierIndex - 1) into the barrier.
                    // These items MUST be empty.

                    const crushZone = newSlots.slice(barrierIndex - slotsNeeded, barrierIndex);
                    const crushCollision = crushZone.some(s => s.componentId !== null);

                    if (crushCollision) {
                        console.warn("Cannot add PSU: Not enough space (Peripherals would collide with System Slot).");
                        // TODO: Notify user?
                        return state;
                    }

                    // 2. Perform Shift
                    // New Slots 0..slotsNeeded-1 = PSU
                    // New Slots slotsNeeded .. barrierIndex-1 = Old Slots 0 .. barrierIndex-slotsNeeded-1
                    // New Slots barrierIndex .. end = Old Slots barrierIndex .. end (Unchanged)

                    const psuSlots = Array.from({ length: slotsNeeded }, (_, i) => ({
                        id: i + 1,
                        type: 'psu' as const,
                        componentId: psuId,
                        width: i === 0 ? psu.width_hp : 4,
                        blockedBy: i === 0 ? null : 1,
                        selectedOptions: options
                    }));

                    const movableContent = newSlots.slice(0, barrierIndex - slotsNeeded);
                    // We need to update IDs and block references for shifted content
                    const shiftedContent = movableContent.map(s => ({
                        ...s,
                        id: s.id + slotsNeeded,
                        blockedBy: s.blockedBy ? s.blockedBy + slotsNeeded : null
                    }));

                    const systemContent = newSlots.slice(barrierIndex);
                    // System content stays as is (IDs don't change because they are effectively physically fixed slots? 
                    // WAIT. If we have a list of slots 1..21.
                    // System is at 21. Barrier 21.
                    // We insert 3.
                    // Content 0..17 shifts to 3..20.
                    // Slot 1 becomes 4.
                    // Slot 21 stays 21? Yes.
                    // So shiftedContent IDs are correct. 
                    // systemContent IDs are ALREADY correct for their position? Yes.

                    newSlots = [...psuSlots, ...shiftedContent, ...systemContent];

                    // Sanity check on IDs?
                    // newSlots[0].id = 1.
                    // shiftedContent[0].id = 1 + 3 = 4.
                    // systemContent[0].id = 21. 
                    // The array length should be preserved.
                    // psu(3) + movable(barrier-3) + system(total-barrier).
                    // Total = 3 + barrier - 3 + total - barrier = total. Correct.

                } else {  // LEFT ALIGNED Logic (Shift Right)

                    // We check if the LAST 'slotsNeeded' slots have content.
                    const lastSlots = newSlots.slice(-slotsNeeded);
                    const hasContent = lastSlots.some(s => s.componentId !== null);

                    if (hasContent) {
                        console.warn("Cannot add PSU: Components would be pushed out of chassis.");
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
                        // PSU slots (i < slotsNeeded) are already set correctly above.
                        // Shifted slots (i >= slotsNeeded) need adjustment.
                        blockedBy: i < slotsNeeded ? s.blockedBy : (s.blockedBy ? s.blockedBy + slotsNeeded : null)
                    }));
                }
            }
        }

        return { psuId, psuOptions: options, slots: newSlots };
    }),

    products: [],
    rules: [],
    articles: [],
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

            // Fetch Articles
            const articles = await api.articles.list();
            set({ articles });
        } catch (error) {
            console.error("Failed to fetch products/rules", error);
        }
    },

    resetConfig: () => set(() => ({
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

    validateRules: (proposedState?: ConfigState, options?: { ignoreCategories?: string[] }) => {
        const state = proposedState || get();
        const { slots, products, chassisId, psuId, rules, slotCount } = state;
        const violations: string[] = [];

        // --- Interface Validation ---
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

        // Calculate Total Power
        let totalPower = 0;
        slots.forEach((slot: any) => {
            if (!slot.componentId) return;
            if (slot.blockedBy) return;
            if (slot.type === 'psu') return;

            const product = products.find((p: any) => p.id === slot.componentId);
            if (!product) return;

            let itemPower = product.powerWatts || 0;
            if (itemPower < 0) return;

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
            totalPower += itemPower;
        });

        // Calculate Required Power (Total + 20% buffer)
        const requiredPower = Math.ceil(totalPower * 1.2);

        // Calculate Used Width (Components + PSU)
        let usedWidth = 0;

        // Sum component widths
        slots.forEach((slot: any) => {
            if (slot.componentId) {
                if (slot.blockedBy) return; // Skip blocked slots to avoid double counting width

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
                if (usedWidth > backplaneWidth) {
                    violations.push(`Total used width (${usedWidth}HP) exceeds backplane capacity (${backplaneWidth}HP).`);
                }
            }
        }

        // Map totalWidth to usedWidth for rules
        const totalWidth = usedWidth;

        rules.forEach((rule: any) => {
            // Check category ignore
            if (options?.ignoreCategories && rule.category && options.ignoreCategories.includes(rule.category)) {
                return;
            }

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
                    if (cond.property === 'totalPower') {
                        if (cond.operator === 'gt') return totalPower > cond.value;
                        if (cond.operator === 'lt') return totalPower < cond.value;
                        if (cond.operator === 'eq') return totalPower === cond.value;
                    }
                    if (cond.property === 'requiredPower') {
                        if (cond.operator === 'gt') return requiredPower > cond.value;
                        if (cond.operator === 'lt') return requiredPower < cond.value;
                        if (cond.operator === 'eq') return requiredPower === cond.value;
                    }
                    if (cond.property === 'chassisId') {
                        if (cond.operator === 'eq') return chassisId === cond.value;
                        if (cond.operator === 'contains' && chassisId) return chassisId.includes(cond.value);
                    }
                }
                else if (cond.type === 'adjacency') {
                    const targetComponentId = cond.componentId;
                    const adjacentTo = cond.adjacentTo; // 'system_slot' or componentId

                    // Find slots with the target component
                    const targetSlots = slots.filter((s: any) => s.componentId === targetComponentId);

                    if (targetSlots.length === 0) return false;

                    return targetSlots.some((slot: any) => {
                        const slotIndex = slots.indexOf(slot); // 0-based index in the array

                        // Check neighbors
                        const neighbors = [];
                        if (slotIndex > 0) neighbors.push(slots[slotIndex - 1]);
                        if (slotIndex < slots.length - 1) neighbors.push(slots[slotIndex + 1]);

                        if (adjacentTo === 'system_slot') {
                            return neighbors.some((n: any) => n.type === 'system');
                        } else {
                            // Check if neighbor has the specific component ID
                            return neighbors.some((n: any) => n.componentId === adjacentTo);
                        }
                    });
                }
                else if (cond.type === 'option_not_selected') {
                    // Check if a specific option is NOT selected (or not matching value)
                    // Currently only supporting chassis options as that's the use case
                    if (cond.componentType === 'chassis') {
                        if (!chassisId) return false; // If no chassis selected, we don't enforce "option not selected" to avoid blocking component addition

                        const val = state.chassisOptions[cond.optionId];
                        // If cond.value is true, we check if val is NOT true (i.e. false or undefined)
                        if (cond.value === true) {
                            return !val;
                        }
                        // Generic check
                        return val !== cond.value;
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
                        } else {
                            // Generic forbid (no specific component ID, just forbid the state)
                            violations.push(action.message || rule.description);
                        }
                    }
                });
            }
        });

        return violations;
    }
}));

