export const CAR_MAKES = [
  'BMW',
  'Benz',
  'Audi',
  'VW',
  'Skoda',
] as const;

export const CAR_MODELS: Record<string, string[]> = {
  BMW: ['1 Series', '2 Series', '3 Series 330i', '3 Series 320d', '5 Series 530d', '5 Series 530i', '7 Series 740Li', 'X1', 'X3 xDrive30e', 'X5 xDrive40i', 'X7', 'M3 Competition', 'M5', 'Z4 M40i', 'iX', 'i4'],
  Benz: ['A-Class A200', 'C-Class C220d', 'C-Class C300', 'E-Class E350d', 'E-Class E200', 'S-Class S450', 'GLA 200', 'GLC 300', 'GLE 400d', 'GLS 450', 'AMG C63 S', 'AMG G63', 'EQS 580', 'CLA 200'],
  Audi: ['A3 35 TFSi', 'A4 40 TFSi', 'A4 45 TFSi', 'A6 45 TFSi', 'A8 L 60 TFSi', 'Q3 40 TFSi', 'Q5 45 TFSi', 'Q7 55 TFSi', 'Q8 55 TFSi', 'RS5 Sportback', 'RS7 Sportback', 'R8 V10', 'e-tron GT', 'S5 Sportback'],
  VW: ['Polo 1.0 TSI', 'Vento 1.5 TDI', 'Passat 2.0 TDI', 'Tiguan 2.0 TSI', 'Taigun 1.5 TSI', 'T-Roc 2.0 TSI', 'GT 1.5 TSI', 'Jetta 2.0 TDI', 'Beetle 2.0 TSI'],
  Skoda: ['Octavia 2.0 TSI', 'Superb 2.0 TDI', 'Kodiaq 2.0 TDI', 'Kushaq 1.5 TSI', 'Slavia 1.5 TSI', 'Rapid 1.0 TSI', 'Laura 2.0 TDI'],
};

export const FUEL_TYPES = ['Petrol', 'Diesel', 'Hybrid', 'Electric', 'Plug-in Hybrid'];

export const COLOURS = [
  'Alpine White', 'Obsidian Black', 'Mythos Black', 'Carrara White', 'Reflex Silver',
  'Mineral Grey', 'Sophisto Grey', 'Black Sapphire', 'Glacier Silver', 'Imola Red',
  'San Marino Blue', 'Tanzanite Blue', 'Emerald Green', 'Nardo Grey', 'Portofino Grey',
  'Daytona Violet', 'Sepang Blue', 'Sonoma Green', 'Python Yellow', 'Frozen Brilliant White',
  'Other',
];

export function formatPlate(plate: string): string {
  return plate.toUpperCase().replace(/\s+/g, ' ').trim();
}

export function maskPlate(plate: string): string {
  const parts = plate.split(' ');
  if (parts.length >= 3) {
    const last = parts[parts.length - 1];
    return `${parts[0]} ${parts[1]} •• ${last}`;
  }
  if (plate.length > 4) {
    return plate.slice(0, 2) + ' •• ' + plate.slice(-4);
  }
  return plate;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  minimumFractionDigits: 0,
  }).format(amount);
}

export function generatePublicToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}
