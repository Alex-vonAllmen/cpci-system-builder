
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
        // Reset Logic: Changing size clears everything
        const newSlots: Slot[] = Array.from({ length: count }, (_, i) => ({
            id: i + 1,
            type: (state.systemSlotPosition === 'left' && i === 0) || (state.systemSlotPosition === 'right' && i === count - 1) ? 'system' : 'peripheral',
            componentId: null,
            width: 4,
            blockedBy: null,
        }));

        return {
            slotCount: count,
            slots: newSlots,
            chassisId: null,
            chassisOptions: {},
            psuId: null,
            psuOptions: {}
        };
    }),

    setSystemSlotPosition: (position) => set((state) => {
        // Reset Logic: Changing position clears everything
        const newSlots: Slot[] = Array.from({ length: state.slotCount }, (_, i) => ({
            id: i + 1,
            type: (position === 'left' && i === 0) || (position === 'right' && i === state.slotCount - 1) ? 'system' : 'peripheral',
            componentId: null,
            width: 4,
            blockedBy: null,
        }));

        return {
            systemSlotPosition: position,
            slots: newSlots,
            chassisId: null,
            chassisOptions: {},
            psuId: null,
            psuOptions: {}
        };
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

        // Determine Direction:
        // Standard: Expand Right (slots i to i + slotsNeeded - 1)
        // Right-System: Expand Left (slots i - slotsNeeded + 1 to i)
        const isRightSystem = state.systemSlotPosition === 'right' && slotId === state.slotCount;

        // Define relevant slots indices
        // slotId is 1-based. Index is slotId - 1.
        const originIndex = slotId - 1;
        let startIndex = originIndex;
        let endIndex = originIndex + slotsNeeded - 1;

        if (isRightSystem) {
            startIndex = originIndex - slotsNeeded + 1;
            endIndex = originIndex;
        }

        // Validation Loop
        let valid = true;
        if (startIndex < 0 || endIndex >= state.slots.length) {
            valid = false;
        } else {
            for (let i = startIndex; i <= endIndex; i++) {
                // Skip the origin slot (we are overwriting it)
                if (i === originIndex) continue;

                const targetSlot = state.slots[i];
                // For other slots, they must be empty or blocked by US.
                if (targetSlot.componentId && targetSlot.blockedBy !== slotId) { valid = false; break; }
                if (targetSlot.blockedBy && targetSlot.blockedBy !== slotId) { valid = false; break; }
            }
        }

        if (!valid) {
            console.warn("Not enough space for component");
            // In a real app we might want to return an error or toast here, 
            // but the UI should ideally preventing clicking.
            return state;
        }

        const newSlots = state.slots.map((s, i) => {
            // The Main Slot
            if (s.id === slotId) {
                return { ...s, componentId, selectedOptions: {}, width, blockedBy: null };
            }

            // The Blocked Slots
            if (i >= startIndex && i <= endIndex && s.id !== slotId) {
                return { ...s, componentId: null, selectedOptions: {}, width: 4, blockedBy: slotId };
            }

            // Unblock if previously blocked by this slot but no longer needed
            if (s.blockedBy === slotId) {
                // If it's OUTSIDE the new range, unblock it
                if (i < startIndex || i > endIndex) {
                    return { ...s, blockedBy: null };
                }
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

        // Determine Direction (Right or Left)
        const isRightSystem = state.systemSlotPosition === 'right' && slotId === state.slotCount;
        const originIndex = slotId - 1;
        let startIndex = originIndex;
        let endIndex = originIndex + slotsNeeded - 1;

        if (isRightSystem) {
            startIndex = originIndex - slotsNeeded + 1;
            endIndex = originIndex;
        }

        // Validity Check
        let valid = true;
        if (startIndex < 0 || endIndex >= state.slots.length) {
            valid = false;
        } else {
            for (let i = startIndex; i <= endIndex; i++) {
                if (i === originIndex) continue;
                const targetSlot = state.slots[i];
                if (targetSlot.componentId && targetSlot.blockedBy !== slotId) { valid = false; break; }
                if (targetSlot.blockedBy && targetSlot.blockedBy !== slotId) { valid = false; break; }
            }
        }

        if (!valid) {
            console.warn("Options increase width too much");
            return state;
        }

        const newSlots = state.slots.map((s, i) => {
            if (s.id === slotId) {
                return { ...s, selectedOptions: options, width };
            }

            // Blocked slots
            if (i >= startIndex && i <= endIndex && s.id !== slotId) {
                return { ...s, componentId: null, selectedOptions: {}, width: 4, blockedBy: slotId };
            }

            // Unblock
            if (s.blockedBy === slotId) {
                if (i < startIndex || i > endIndex) {
                    return { ...s, blockedBy: null };
                }
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
                // SMART SHIFT STRATEGY:
                // We need `slotsNeeded` space at the front.
                // We want to find `slotsNeeded` empty slots in the rack and "collapse" them to make room.
                // We scan from Right to Left to find empty slots that are NOT the system slot (unless we move it? No).

                let emptyIndicesFound: number[] = [];
                for (let i = newSlots.length - 1; i >= 0; i--) {
                    const s = newSlots[i];
                    // Can we sacrifice this slot?
                    // It must be:
                    // 1. Empty (no component)
                    // 2. Not blocked
                    // 3. Not a System Slot (unless we want to shift system? Users usually want system preserved)
                    if (s.componentId === null && s.blockedBy === null && s.type !== 'system') {
                        emptyIndicesFound.push(i);
                        if (emptyIndicesFound.length === slotsNeeded) break;
                    }
                }

                if (emptyIndicesFound.length < slotsNeeded) {
                    // Fallback to naive check (will fail if end is full, as observed)
                    const lastSlots = newSlots.slice(-slotsNeeded);
                    const hasContent = lastSlots.some(s => s.componentId !== null || s.type === 'system'); // Also protect system slot at end
                    if (hasContent) {
                        console.warn("Cannot add PSU: Not enough free space to shift.");
                        return state;
                    }
                    // If naive check passes (end is empty), we just shift right and drop the end.
                } else {
                    // We found enough empty slots! 
                    // Remove them from the array to "collapse" the rack
                    // Sort indices descending to splice safely
                    emptyIndicesFound.sort((a, b) => b - a);
                    emptyIndicesFound.forEach(idx => {
                        newSlots.splice(idx, 1);
                    });
                }

                // If we didn't find specific empty slots but the generic check passed (in the 'fallback' block equivalent logic),
                // we still need to reduce array size to (Total - SlotsNeeded) before prepending.
                // If we used the 'splice' above, `newSlots.length` is now `Total - SlotsNeeded`.
                // If we didn't (naive path), we need to slice.

                if (newSlots.length > slotCount - slotsNeeded) {
                    newSlots = newSlots.slice(0, slotCount - slotsNeeded);
                }

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
                newSlots = [...psuSlots, ...newSlots];

                // Re-assign IDs
                newSlots = newSlots.map((s, i) => ({
                    ...s,
                    id: i + 1,
                    // blockedBy needs adjustment if we shifted?
                    // If a component was blocked by slot X, it is now blocked by slot X + slotsNeeded.
                    // Wait, if we spliced empty slots from the middle, the relative blocking might be preserved 
                    // BUT the IDs changed.
                    // If Slot 5 blocked Slot 6. And Slot 3 was removed.
                    // Old Slot 5 becomes New Slot 4. Old Slot 6 becomes New Slot 5.
                    // We need to re-calculate blocking or adjust IDs.

                    // Actually, `blockedBy` relies on IDs.
                    // If we shift, we must adjust `blockedBy`.
                    // A simple shift (add to distinct start) means `+ slotsNeeded`.
                    // But if we removed internal slots?

                    // It's safer to Reset BlockedBy logic entirely or keep it relative?
                    // Component at Index I blocked Index I+1.
                    // After shift, checks:
                    // If component at Index J was blocking Index J+1.
                    // Since we only removed EMPTY slots, no blocked groups should be split.
                    // So relative adjacency is preserved.
                    // But the IDs stored in `blockedBy` (which are Slot IDs, aka Index+1) need update.

                    // Complication: We are iterating `newSlots`.
                    // We can't easily map old blockedBy ID to new ID without tracking moves.

                    // STRATEGY: Clear `blockedBy` and Recalculate it from scratch based on `componentId` widths.
                    // This is robust.
                    blockedBy: s.type === 'psu' ? (i === 0 ? null : 1) : null
                }));

                // Recalculate blocking for all slots
                for (let i = 0; i < newSlots.length; i++) {
                    const slot = newSlots[i];
                    if (slot.componentId && slot.type !== 'psu') {
                        // We need to know the width. But the width property might be stale or just a number.
                        // We should look up the product ideally, or trust `slot.width`.
                        // `slot.width` should be preserved from the copy.
                        const slotsRequired = Math.ceil(slot.width / 4);
                        if (slotsRequired > 1) {
                            // Block subsequent slots
                            // IMPORTANT: Handle Leftward expansion (Right System Slot) if applicable?
                            // But here we just re-apply blocking based on current position?
                            // If it was Right System Slot, it is now... where?
                            // If we have Right Alignment, `state.systemSlotPosition` is 'right'.
                            // Is this slot currently the last one?

                            // If systemSlotPosition is Right, the system slot is at `slotCount - 1`.
                            // Wait, `slotCount` typically doesn't change.
                            // Validating Position:
                            const isRightSys = state.systemSlotPosition === 'right' && i === newSlots.length - 1 && slot.type === 'system';

                            const startBlock = isRightSys ? i - slotsRequired + 1 : i + 1;
                            const endBlock = isRightSys ? i - 1 : i + slotsRequired - 1;

                            // Apply blocking
                            // Note: Loop bounds depend on direction
                            if (isRightSys) {
                                for (let b = startBlock; b <= endBlock; b++) {
                                    if (newSlots[b]) newSlots[b].blockedBy = slot.id;
                                }
                            } else {
                                for (let b = startBlock; b <= endBlock; b++) {
                                    if (newSlots[b]) newSlots[b].blockedBy = slot.id;
                                }
                            }
                        }
                    }
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

