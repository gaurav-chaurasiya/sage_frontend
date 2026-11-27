export function voiceOf({ gender = "female", created_by = "self" } = {}) {
  const self = created_by === "self";
  const female = gender === "female";
  const your = self ? "your" : female ? "her" : "his";
  const Your = self ? "Your" : female ? "Her" : "His";
  const you = self ? "you" : female ? "she" : "he";
  const yourself = self ? "yourself" : female ? "her" : "him";
  const me = self ? "me" : female ? "her" : "him";
  const my = self ? "my" : female ? "her" : "his";
  const myself = self ? "myself" : female ? "her" : "him";
  return { self, female, your, Your, you, yourself, me, my, myself };
}

export function applyIdentity(form, key, value) {
  const next = { ...form, [key]: value };
  const locked = ["son", "daughter", "brother", "sister"].includes(next.created_by);
  if (key === "created_by") {
    if (value === "son" || value === "brother") {
      next.gender = "male";
      next.looking_for = "bride";
    } else if (value === "daughter" || value === "sister") {
      next.gender = "female";
      next.looking_for = "groom";
    }
  }
  if (key === "looking_for" && !locked) {
    next.gender = value === "groom" ? "female" : "male";
  }
  if (key === "gender" && !locked) {
    next.looking_for = value === "female" ? "groom" : "bride";
  }
  return next;
}

export function lookingLocked(createdBy) {
  return ["son", "daughter", "brother", "sister"].includes(createdBy);
}

export function heightOptions() {
  const rows = [];
  for (let cm = 134; cm <= 213; cm += 1) {
    const inches = Math.round(cm / 2.54);
    const ft = Math.floor(inches / 12);
    const inch = inches % 12;
    rows.push({ value: String(cm), label: `${ft}ft ${inch}in - ${cm}cm` });
  }
  return rows;
}

export function aboutDraft(v) {
  return `It is a pleasure introducing ${v.myself}. As a family, we are closely connected and support each other. A considerate life partner who will support ${v.me} through all walks of life will be ${v.my} ideal match. Kindly feel free to contact if you wish to take things forward.`;
}

export const PROFILE_FOR = [
  { value: "self", label: "Myself" },
  { value: "son", label: "My son" },
  { value: "daughter", label: "My daughter" },
  { value: "brother", label: "My brother" },
  { value: "sister", label: "My sister" },
  { value: "relative", label: "Relative" },
  { value: "friend", label: "Friend" },
];

export const MARITAL = [
  { value: "never_married", label: "Never Married" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
  { value: "awaiting_divorce", label: "Awaiting Divorce" },
  { value: "annulled", label: "Annulled" },
];

// Common currencies for NRI + domestic matrimony audiences. Merged with
// whatever the API's taxonomy returns so the list stays broad even if the
// backend's own list is shorter.
export const CURRENCIES = [
  "INR", "USD", "GBP", "EUR", "AUD", "CAD", "AED", "SGD", "SAR", "QAR",
  "KWD", "OMR", "BHD", "PKR", "NZD", "ZAR", "MYR", "HKD", "JPY", "CNY", "CHF",
];

export const OTHER_CITY = "__other_city__";

// Appends an "Other" entry to profession groups (in the trailing "Other"
// group when one exists) so users whose occupation isn't listed can type
// their own instead of being stuck picking the closest fit.
export function professionsWithOther(groups) {
  const list = Array.isArray(groups) ? groups : [];
  if (!list.length) return [{ group: "Other", items: ["Other"] }];
  const already = list.some((g) => (g.items || []).some((i) => String(i).toLowerCase() === "other"));
  if (already) return list;
  return list.map((g, i) => (i === list.length - 1 ? { ...g, items: [...(g.items || []), "Other"] } : g));
}

export const INCOME_MONTHLY = [
  { value: "Doesn't earn", label: "Doesn't earn" },
  { value: "Upto 1 Lakh", label: "Upto ₹ 8,000 monthly" },
  { value: "1-2 Lakh", label: "₹ 8,000 to 17,000 monthly" },
  { value: "2-4 Lakh", label: "₹ 17,000 to 33,000 monthly" },
  { value: "3-5 Lakh", label: "₹ 25,000 to 42,000 monthly" },
  { value: "4-7 Lakh", label: "₹ 33,000 to 58,000 monthly" },
  { value: "5-10 Lakh", label: "₹ 42,000 to 83,000 monthly" },
  { value: "7-10 Lakh", label: "₹ 58,000 to 83,000 monthly" },
  { value: "10-15 Lakh", label: "₹ 83,000 to 1.25 Lakh monthly" },
  { value: "15-20 Lakh", label: "₹ 1.25 to 1.67 Lakh monthly" },
  { value: "15-25 Lakh", label: "₹ 1.25 to 2 Lakh monthly" },
  { value: "20-30 Lakh", label: "₹ 1.67 to 2.5 Lakh monthly" },
  { value: "25-50 Lakh", label: "₹ 2 to 4 Lakh monthly" },
  { value: "30-50 Lakh", label: "₹ 2.5 to 4 Lakh monthly" },
  { value: "50 Lakh - 1 Cr", label: "₹ 4 to 6 Lakh monthly" },
  { value: "75 Lakh - 1 Cr", label: "₹ 6 to 8 Lakh monthly" },
  { value: "1 Cr+", label: "₹ 8 Lakh to 25 Lakh monthly" },
  { value: "3-5 Cr", label: "₹ 25 to 42 Lakh monthly" },
  { value: "5-10 Cr", label: "₹ 42 Lakh to 83 Lakh monthly" },
  { value: "10 Cr+", label: "₹ 83 Lakh & above monthly" },
];
