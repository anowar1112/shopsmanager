/** Realistic demo catalogue for a Bangladeshi variety/retail shop. */

export interface SeedProduct {
  name: string;
  sku: string;
  unit: string;
  cost: number;
  price: number;
  stock: number;
  min: number;
  /** Relative sales weight — fast movers get picked more often. */
  popularity: number;
}

export const SEED_CATEGORIES: Record<string, SeedProduct[]> = {
  'Rice & Grains': [
    { name: 'Miniket Rice 5kg', sku: 'RIC-MIN-5', unit: 'packet', cost: 380, price: 430, stock: 42, min: 10, popularity: 9 },
    { name: 'Nazirshail Rice 5kg', sku: 'RIC-NAZ-5', unit: 'packet', cost: 410, price: 465, stock: 28, min: 10, popularity: 6 },
    { name: 'Chinigura Rice 1kg', sku: 'RIC-CHI-1', unit: 'packet', cost: 135, price: 155, stock: 36, min: 12, popularity: 5 },
    { name: 'Atta 2kg', sku: 'GRN-ATT-2', unit: 'packet', cost: 110, price: 128, stock: 8, min: 15, popularity: 7 },
    { name: 'Moshur Dal 1kg', sku: 'GRN-MSD-1', unit: 'kg', cost: 118, price: 138, stock: 54, min: 15, popularity: 8 },
    { name: 'Chola Boot 1kg', sku: 'GRN-CHB-1', unit: 'kg', cost: 95, price: 112, stock: 22, min: 10, popularity: 4 },
  ],
  'Cooking Essentials': [
    { name: 'Fresh Soyabean Oil 5L', sku: 'OIL-FRS-5', unit: 'litre', cost: 790, price: 855, stock: 19, min: 8, popularity: 9 },
    { name: 'Rupchanda Soyabean Oil 1L', sku: 'OIL-RUP-1', unit: 'litre', cost: 168, price: 185, stock: 46, min: 15, popularity: 8 },
    { name: 'Teer Sugar 1kg', sku: 'SUG-TER-1', unit: 'kg', cost: 118, price: 135, stock: 63, min: 20, popularity: 9 },
    { name: 'ACI Pure Salt 1kg', sku: 'SLT-ACI-1', unit: 'kg', cost: 32, price: 42, stock: 88, min: 25, popularity: 8 },
    { name: 'Radhuni Turmeric Powder 200g', sku: 'SPC-RTP-2', unit: 'packet', cost: 62, price: 78, stock: 34, min: 12, popularity: 6 },
    { name: 'Radhuni Chilli Powder 200g', sku: 'SPC-RCP-2', unit: 'packet', cost: 78, price: 95, stock: 4, min: 12, popularity: 6 },
    { name: 'Pran Ghee 200ml', sku: 'DRY-PGH-2', unit: 'packet', cost: 320, price: 375, stock: 14, min: 6, popularity: 3 },
  ],
  'Snacks & Biscuits': [
    { name: 'Olympic Energy Plus Biscuit', sku: 'BIS-OEP-1', unit: 'packet', cost: 22, price: 30, stock: 120, min: 30, popularity: 10 },
    { name: 'Pran Potato Crackers', sku: 'SNK-PPC-1', unit: 'packet', cost: 18, price: 25, stock: 96, min: 30, popularity: 8 },
    { name: 'Bombay Sweets Chanachur 150g', sku: 'SNK-BSC-1', unit: 'packet', cost: 38, price: 50, stock: 52, min: 20, popularity: 7 },
    { name: 'Nabisco Cream Cracker', sku: 'BIS-NCC-1', unit: 'packet', cost: 28, price: 38, stock: 0, min: 20, popularity: 6 },
    { name: 'Pran Chocolate Wafer', sku: 'SNK-PCW-1', unit: 'packet', cost: 12, price: 18, stock: 140, min: 40, popularity: 9 },
  ],
  'Beverages': [
    { name: 'Pran Mango Juice 1L', sku: 'BEV-PMJ-1', unit: 'litre', cost: 105, price: 130, stock: 38, min: 12, popularity: 7 },
    { name: 'Coca-Cola 1.25L', sku: 'BEV-COK-1', unit: 'litre', cost: 72, price: 90, stock: 44, min: 15, popularity: 9 },
    { name: 'Mum Drinking Water 1L', sku: 'BEV-MUM-1', unit: 'litre', cost: 15, price: 22, stock: 156, min: 48, popularity: 10 },
    { name: 'Ispahani Mirzapore Tea 400g', sku: 'BEV-IMT-4', unit: 'packet', cost: 215, price: 255, stock: 21, min: 8, popularity: 6 },
    { name: 'Nescafe Classic 50g', sku: 'BEV-NSC-5', unit: 'packet', cost: 245, price: 290, stock: 11, min: 6, popularity: 4 },
  ],
  'Personal Care': [
    { name: 'Lux Soap 100g', sku: 'PC-LUX-100', unit: 'pcs', cost: 48, price: 62, stock: 74, min: 24, popularity: 8 },
    { name: 'Dettol Soap 100g', sku: 'PC-DTL-100', unit: 'pcs', cost: 52, price: 68, stock: 58, min: 24, popularity: 7 },
    { name: 'Sunsilk Shampoo 180ml', sku: 'PC-SSL-180', unit: 'pcs', cost: 175, price: 210, stock: 26, min: 10, popularity: 6 },
    { name: 'Colgate Toothpaste 100g', sku: 'PC-CLG-100', unit: 'pcs', cost: 88, price: 110, stock: 41, min: 15, popularity: 7 },
    { name: 'Head & Shoulders Shampoo 180ml', sku: 'PC-HNS-180', unit: 'pcs', cost: 265, price: 315, stock: 3, min: 8, popularity: 4 },
    { name: 'Gillette Razor Twin Pack', sku: 'PC-GIL-2', unit: 'packet', cost: 95, price: 125, stock: 18, min: 8, popularity: 3 },
  ],
  'Household': [
    { name: 'Surf Excel Detergent 1kg', sku: 'HH-SRF-1', unit: 'kg', cost: 215, price: 255, stock: 32, min: 12, popularity: 8 },
    { name: 'Wheel Powder 500g', sku: 'HH-WHL-500', unit: 'packet', cost: 58, price: 75, stock: 66, min: 20, popularity: 9 },
    { name: 'Harpic Toilet Cleaner 500ml', sku: 'HH-HRP-500', unit: 'pcs', cost: 145, price: 180, stock: 24, min: 10, popularity: 5 },
    { name: 'Bashundhara Tissue Box', sku: 'HH-BTS-1', unit: 'box', cost: 55, price: 75, stock: 48, min: 18, popularity: 7 },
    { name: 'Savlon Hand Wash 200ml', sku: 'HH-SVL-200', unit: 'pcs', cost: 98, price: 125, stock: 29, min: 12, popularity: 5 },
  ],
  'Stationery': [
    { name: 'Matador Ball Pen (Blue)', sku: 'ST-MTD-BLU', unit: 'pcs', cost: 6, price: 10, stock: 240, min: 60, popularity: 8 },
    { name: 'Fresh Exercise Book 200 Page', sku: 'ST-FEB-200', unit: 'pcs', cost: 55, price: 75, stock: 62, min: 20, popularity: 6 },
    { name: 'A4 Paper Ream 500 Sheet', sku: 'ST-A4R-500', unit: 'packet', cost: 480, price: 560, stock: 9, min: 5, popularity: 3 },
  ],
  'Electronics Accessories': [
    { name: 'Samsung Charger 15W', sku: 'EL-SMC-15', unit: 'pcs', cost: 620, price: 790, stock: 14, min: 5, popularity: 4 },
    { name: 'USB Type-C Cable 1m', sku: 'EL-UTC-1', unit: 'pcs', cost: 130, price: 199, stock: 37, min: 12, popularity: 6 },
    { name: 'Walton LED Bulb 12W', sku: 'EL-WLB-12', unit: 'pcs', cost: 145, price: 195, stock: 26, min: 10, popularity: 5 },
    { name: 'Panasonic AA Battery 2pcs', sku: 'EL-PAB-2', unit: 'packet', cost: 42, price: 65, stock: 55, min: 20, popularity: 6 },
  ],
};

export const SEED_CUSTOMERS = [
  { name: 'Rahim Uddin', phone: '01712345601', address: 'Mirpur 10, Dhaka' },
  { name: 'Shahnaz Parvin', phone: '01812345602', address: 'Kazipara, Dhaka' },
  { name: 'Jashim Mia', phone: '01912345603', address: 'Shewrapara, Dhaka' },
  { name: 'Nasrin Akter', phone: '01612345604', address: 'Mirpur 11, Dhaka' },
  { name: 'Abdul Karim', phone: '01512345605', address: 'Pallabi, Dhaka' },
  { name: 'Farhana Yeasmin', phone: '01312345606', address: 'Monipur, Dhaka' },
  { name: 'Sabbir Hossain', phone: '01712345607', address: 'Agargaon, Dhaka' },
  { name: 'Ruma Begum', phone: '01812345608', address: 'Kafrul, Dhaka' },
  { name: 'Delwar Hossain Talukder', phone: '01912345609', address: 'Mirpur 12, Dhaka' },
  { name: 'Tanjina Islam', phone: '01612345610', address: 'Ibrahimpur, Dhaka' },
];

export const SEED_SUPPLIERS = [
  { name: 'Kamal Traders', phone: '01711000001', company: 'Kamal Traders', address: 'Karwan Bazar, Dhaka' },
  { name: 'Hossain Distribution', phone: '01811000002', company: 'Hossain Distribution Ltd', address: 'Moulvibazar, Dhaka' },
  { name: 'New Star Agency', phone: '01911000003', company: 'New Star Agency', address: 'Mirpur 1, Dhaka' },
  { name: 'Bismillah Enterprise', phone: '01611000004', company: 'Bismillah Enterprise', address: 'Shyampur, Dhaka' },
  { name: 'Alif Wholesale', phone: '01511000005', company: 'Alif Wholesale', address: 'Gabtoli, Dhaka' },
];

export const SEED_EXPENSES: Array<{ category: string; amount: number; description: string; dayOfMonth?: number }> = [
  { category: 'RENT', amount: 18000, description: 'Monthly shop rent', dayOfMonth: 3 },
  { category: 'SALARY', amount: 22000, description: 'Staff salary', dayOfMonth: 5 },
  { category: 'UTILITY', amount: 4200, description: 'Electricity bill', dayOfMonth: 8 },
  { category: 'TRANSPORT', amount: 900, description: 'Goods carrying van fare' },
  { category: 'TRANSPORT', amount: 650, description: 'Rickshaw fare for stock pickup' },
  { category: 'MAINTENANCE', amount: 1500, description: 'Refrigerator servicing' },
  { category: 'MAINTENANCE', amount: 800, description: 'Shutter repair' },
  { category: 'MARKETING', amount: 2500, description: 'Banner and leaflet printing' },
  { category: 'OTHER', amount: 450, description: 'Cleaning supplies' },
  { category: 'OTHER', amount: 1200, description: 'Trade licence renewal fee' },
];
