export interface ProductOption {
    id: string;
    label: string;
    type: 'select' | 'boolean';
    choices?: { label: string; value: string; priceMod?: number }[];
    priceMod?: number; // For boolean options
    externalInterfacesMod?: { type: string; connector: string; count: number }[];
    default?: any;
}

export interface Product {
    id: string;
    type: 'cpu' | 'storage' | 'network' | 'io' | 'carrier' | 'chassis' | 'psu' | 'accessory' | 'backplane' | 'miscellaneous';
    name: string;
    description: string;
    powerWatts: number;
    widthHp: number;
    price: number;
    imageUrl?: string;
    url?: string;
    eol_date?: string;
    heightU?: number;
    connectors?: string[];
    options?: ProductOption[];
    interfaces?: Record<string, number>;
    externalInterfaces?: { type: string; connector: string; count: number }[];
}

export const MOCK_PRODUCTS: Product[] = [
    // CPUs
    {
        id: 'G25A',
        type: 'cpu',
        name: 'G25A Intel Xeon',
        description: 'Intel Xeon E3-1500 v5, 32GB RAM, 4HP',
        powerWatts: 35,
        widthHp: 4,
        price: 2500,
        options: [
            {
                id: 'ram',
                label: 'Memory',
                type: 'select',
                choices: [
                    { label: '16GB DDR4', value: '16gb', priceMod: 0 },
                    { label: '32GB DDR4', value: '32gb', priceMod: 200 },
                ],
                default: '16gb'
            },
            {
                id: 'coating',
                label: 'Conformal Coating',
                type: 'boolean',
                priceMod: 50,
                default: false
            }
        ]
    },
    {
        id: 'G28',
        type: 'cpu',
        name: 'G28 Intel Core i7',
        description: 'Intel Core i7-6600EQ, 16GB RAM, 4HP',
        powerWatts: 25,
        widthHp: 4,
        price: 1800,
    },

    // Storage
    {
        id: 'G51',
        type: 'storage',
        name: 'G51 NVMe Carrier',
        description: 'Quad M.2 NVMe SSD Carrier',
        powerWatts: 10,
        widthHp: 4,
        price: 450,
        options: [
            {
                id: 'drive1',
                label: 'Drive Slot 1',
                type: 'select',
                choices: [
                    { label: 'None', value: 'none', priceMod: 0 },
                    { label: '512GB NVMe', value: '512gb', priceMod: 100 },
                    { label: '1TB NVMe', value: '1tb', priceMod: 180 },
                ],
                default: 'none'
            }
        ]
    },
    {
        id: 'G52',
        type: 'storage',
        name: 'G52 SATA Carrier',
        description: '2.5" SATA SSD/HDD Carrier',
        powerWatts: 5,
        widthHp: 4,
        price: 300,
    },

    // Network
    {
        id: 'G211',
        type: 'network',
        name: 'G211 Gigabit Ethernet',
        description: '4-port Gigabit Ethernet Controller',
        powerWatts: 8,
        widthHp: 4,
        price: 550,
    },

    // I/O
    {
        id: 'G215',
        type: 'io',
        name: 'G215 Serial I/O',
        description: '8-port RS-232/422/485',
        powerWatts: 3,
        widthHp: 4,
        price: 400,
    },
    // Chassis
    {
        id: 'C01',
        type: 'chassis',
        name: '19" Rack Mount Chassis',
        description: '4U, 84HP, 9-slot backplane support',
        powerWatts: 0,
        widthHp: 84,
        price: 800,
    },
    {
        id: 'C02',
        type: 'chassis',
        name: 'Compact Wall Mount Chassis',
        description: 'Shoebox style, 4-slot support',
        powerWatts: 0,
        widthHp: 28,
        price: 600,
    },

    // Power Supplies
    {
        id: 'P300',
        type: 'psu',
        name: '300W Pluggable PSU',
        description: '3U, 8HP, 300W Output',
        powerWatts: 0,
        widthHp: 8,
        price: 350,
    },
    {
        id: 'P600',
        type: 'psu',
        name: '600W Open Frame PSU',
        description: 'Internal mounting, 600W Output',
        powerWatts: 0,
        widthHp: 0,
        price: 250,
    },
];
