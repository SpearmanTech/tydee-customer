const SUB_SERVICE_CONFIGS = {
  // --- HAIR SERVICES ---
  "Braiding (Knotless)": [
    {
      key: "hair_length",
      type: "select",
      label: "Desired Length",
      options: ["Shoulder", "Mid-back", "Waist", "Knee"],
      icon: "ruler",
    },
    {
      key: "braid_size",
      type: "select",
      label: "Braid Size",
      options: ["Large", "Medium", "Small/Smedium"],
      icon: "grid",
    },
    {
      key: "provide_hair",
      type: "toggle",
      label: "Pro should provide hair extensions",
      hint: "Pros usually charge an extra fee for purchasing hair.",
    },
    {
      key: "hair_washed",
      type: "toggle",
      label: "Hair is already washed & blown out",
      icon: "water",
    },
  ],
  "Hair Styling & Install": [
    {
      key: "service_type",
      type: "select",
      label: "Styling Type",
      options: ["Wig Install", "Silk Press", "Pony Tail", "Wash & Set"],
      icon: "content-cut",
    },
    {
      key: "is_new_wig",
      type: "toggle",
      label: "New Wig? (Requires plucking/bleaching)",
      icon: "sparkles",
    },
    {
      key: "travel_setup",
      type: "toggle",
      label: "I have a chair and mirror ready",
      hint: "Helps the pro know if they need to bring a portable chair.",
    },
  ],

  // --- BEAUTY SERVICES ---
  "Nail Tech (Full Set)": [
    {
      key: "set_type",
      type: "select",
      label: "Set Type",
      options: ["Acrylic Full Set", "Gel Overlay", "Biab"],
      icon: "hand-back-left",
    },
    {
      key: "nail_art_count",
      type: "counter",
      label: "Nails with Art/Designs",
      icon: "brush",
    },
    {
      key: "needs_soak_off",
      type: "toggle",
      label: "I need a soak-off/removal",
      hint: "Adds 30-45 mins to the appointment.",
    },
    {
      key: "pedicure_add",
      type: "toggle",
      label: "Add basic pedicure?",
      icon: "footsteps",
    },
  ],
  "Makeup Artist (Glam)": [
    {
      key: "occasion",
      type: "select",
      label: "Occasion",
      options: ["Soft Glam", "Full Bridal", "Editorial/Photoshoot"],
      icon: "camera",
    },
    {
      key: "lash_preference",
      type: "select",
      label: "Lashes",
      options: ["Strip Lashes", "Individual Clusters", "No Lashes"],
      icon: "eye",
    },
    {
      key: "guest_count",
      type: "counter",
      label: "Additional people for makeup",
      icon: "people",
    },
  ],

  // --- GROOMING ---
  "Mobile Barbering": [
    {
      key: "cut_type",
      type: "select",
      label: "Service",
      options: [
        "Haircut Only",
        "Beard Trim/Lineup",
        "Full Service (Hair & Beard)",
      ],
      icon: "content-cut",
    },
    {
      key: "kids_count",
      type: "counter",
      label: "Number of Kids (under 12)",
      icon: "person",
    },
    {
      key: "senior_count",
      type: "counter",
      label: "Number of Seniors",
      icon: "person-cane",
    },
  ],
  "General/Basic Cleaning": [
    {
      key: "rooms_count",
      type: "counter",
      label: "Living Areas / Lounges",
      icon: "sofa",
    },
    { key: "bedrooms_count", type: "counter", label: "Bedrooms", icon: "bed" },
    {
      key: "bathrooms_count",
      type: "counter",
      label: "Bathrooms",
      icon: "bath",
    },
    {
      key: "provide_materials",
      type: "toggle",
      label: "I will provide cleaning materials",
      hint: "Pros charge more if they bring their own.",
    },
    {
      key: "has_pets",
      type: "toggle",
      label: "Has Pets? (Hair removal)",
      icon: "dog",
    },
  ],
  "Spring Clean": [
    { key: "rooms_count", type: "counter", label: "Total Rooms", icon: "home" },
    {
      key: "inside_cupboards",
      type: "toggle",
      label: "Clean inside cupboards?",
      icon: "archive",
    },
    {
      key: "windows_count",
      type: "counter",
      label: "Interior Window Panes",
      icon: "layout",
    },
    {
      key: "is_move_out",
      type: "toggle",
      label: "Is this a Move-out / Move-in clean?",
      hint: "Requires empty-house deep scrubbing.",
    },
  ],
  "Oven Cleaning": [
    {
      key: "ovens_count",
      type: "counter",
      label: "Number of Ovens",
      icon: "hash",
    },
    {
      key: "is_gas",
      type: "toggle",
      label: "Is it a Gas Oven?",
      icon: "flame",
    },
    {
      key: "include_hob",
      type: "toggle",
      label: "Include Stove-top / Hob?",
      icon: "disc",
    },
  ],

  "Leak Repair": [
    {
      key: "num_leaks",
      type: "counter",
      label: "Number of Leaks",
      icon: "droplets",
    },
    {
      key: "pipes_behind_wall",
      type: "toggle",
      label: "Pipes behind walls/under tiles?",
      icon: "wall",
    },
    {
      key: "is_emergency",
      type: "toggle",
      label: "Active Flooding / Emergency?",
      icon: "alert-octagon",
    },
    {
      key: "fixture_type",
      type: "picker",
      label: "Primary Fixture",
      options: ["Tap", "Toilet", "Shower", "External Pipe"],
    },
  ],
  "Geyser Service": [
    {
      key: "geyser_age",
      type: "counter",
      label: "Approx Age of Geyser (Years)",
      icon: "calendar",
    },
    {
      key: "geyser_location",
      type: "picker",
      label: "Location",
      options: ["Roof/Ceiling", "External Wall", "Garage"],
    },
    {
      key: "is_solar",
      type: "toggle",
      label: "Solar Integrated System?",
      icon: "sun",
    },
    {
      key: "is_tripping",
      type: "toggle",
      label: "Tripping Electricity?",
      icon: "zap",
    },
  ],

  // --- OUTDOOR CATEGORY ---
  "Gutter Cleaning": [
    {
      key: "floors_count",
      type: "counter",
      label: "Number of Stories",
      icon: "layers",
    },
    {
      key: "gutter_guards",
      type: "toggle",
      label: "Gutter guards installed?",
      hint: "Takes longer to remove and replace.",
    },
    {
      key: "is_accessible",
      type: "toggle",
      label: "Roof is walkable?",
      icon: "check-circle",
    },
    {
      key: "take_debris",
      type: "toggle",
      label: "Pro must bag and take away debris?",
      icon: "trash-2",
    },
  ],
};
