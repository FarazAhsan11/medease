export type Medicine = {
  id: string;
  name: string;
  strength: string;
  form: string;
  packSize: string;
  category: string;
  price: number;
  requiresPrescription: boolean;
};

export type CartItem = {
  medicineId: string;
  quantity: number;
};

export const medicineCategories = [
  "All",
  "Pain relief",
  "Cold & flu",
  "Diabetes",
  "Heart",
  "Vitamins",
  "Digestive",
];

export const medicines: Medicine[] = [
  {
    id: "paracetamol-500",
    name: "Paracetamol",
    strength: "500 mg",
    form: "Tablet",
    packSize: "Strip of 20",
    category: "Pain relief",
    price: 90,
    requiresPrescription: false,
  },
  {
    id: "ibuprofen-400",
    name: "Ibuprofen",
    strength: "400 mg",
    form: "Tablet",
    packSize: "Strip of 10",
    category: "Pain relief",
    price: 140,
    requiresPrescription: false,
  },
  {
    id: "cetirizine-10",
    name: "Cetirizine",
    strength: "10 mg",
    form: "Tablet",
    packSize: "Strip of 10",
    category: "Cold & flu",
    price: 120,
    requiresPrescription: false,
  },
  {
    id: "metformin-500",
    name: "Metformin",
    strength: "500 mg",
    form: "Tablet",
    packSize: "Box of 30",
    category: "Diabetes",
    price: 380,
    requiresPrescription: true,
  },
  {
    id: "atorvastatin-20",
    name: "Atorvastatin",
    strength: "20 mg",
    form: "Tablet",
    packSize: "Box of 30",
    category: "Heart",
    price: 650,
    requiresPrescription: true,
  },
  {
    id: "vitamin-d3",
    name: "Vitamin D3",
    strength: "50,000 IU",
    form: "Capsule",
    packSize: "Pack of 4",
    category: "Vitamins",
    price: 420,
    requiresPrescription: false,
  },
  {
    id: "omeprazole-20",
    name: "Omeprazole",
    strength: "20 mg",
    form: "Capsule",
    packSize: "Strip of 14",
    category: "Digestive",
    price: 310,
    requiresPrescription: false,
  },
  {
    id: "amlodipine-5",
    name: "Amlodipine",
    strength: "5 mg",
    form: "Tablet",
    packSize: "Box of 30",
    category: "Heart",
    price: 290,
    requiresPrescription: true,
  },
];

export const sampleCart: CartItem[] = [
  { medicineId: "paracetamol-500", quantity: 2 },
  { medicineId: "vitamin-d3", quantity: 1 },
];

export const DELIVERY_FEE = 150;

export function getMedicineById(id: string) {
  return medicines.find((medicine) => medicine.id === id);
}
