// Cities a patient can save an address in, and later the cities a lab collects
// samples in (LAB-06). A fixed list so the two always match: free text
// ("lahore", "Lhr") would miss. Add a city here when the service reaches it.
export const cities = [
  "Abbottabad",
  "Bahawalpur",
  "Faisalabad",
  "Gujranwala",
  "Gujrat",
  "Hyderabad",
  "Islamabad",
  "Jhelum",
  "Karachi",
  "Lahore",
  "Mardan",
  "Multan",
  "Peshawar",
  "Quetta",
  "Rahim Yar Khan",
  "Rawalpindi",
  "Sahiwal",
  "Sargodha",
  "Sheikhupura",
  "Sialkot",
  "Sukkur",
] as const;

export type City = (typeof cities)[number];
