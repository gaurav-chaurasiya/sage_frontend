export const INTEREST_GROUPS = [
  {
    id: "creative",
    title: "Creative",
    items: [
      "Writing",
      "Cooking",
      "Singing",
      "Photography",
      "Playing instruments",
      "Painting",
      "DIY crafts",
      "Dancing",
      "Acting",
      "Poetry",
      "Gardening",
      "Blogging",
      "Content creation",
      "Designing",
      "Doodling",
    ],
  },
  {
    id: "fun",
    title: "Fun",
    items: [
      "Movies",
      "Music",
      "Travelling",
      "Reading",
      "Sports",
      "Social media",
      "Gaming",
      "Binge-watching",
      "Biking",
      "Clubbing",
      "Shopping",
      "Theater & Events",
      "Anime",
      "Stand ups",
    ],
  },
  {
    id: "fitness",
    title: "Fitness",
    items: ["Running", "Cycling", "Yoga & Meditation", "Walking", "Working out", "Trekking", "Aerobics/Zumba", "Swimming"],
  },
  {
    id: "other",
    title: "Other interests",
    items: ["Pets", "Foodie", "Vegan", "News & Politics", "Social service"],
  },
];

export function verifyPronoun(user) {
  if (user?.created_by && user.created_by !== "self") {
    return user.gender === "female" ? "her" : "his";
  }
  return "your";
}
