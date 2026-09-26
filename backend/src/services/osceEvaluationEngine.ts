export interface OSCERubricItemInput {
  id: string;
  category: string;
  criterion: string;
  description?: string | null;
  intent?: string | null;
  marks: number;
  required: boolean;
  isCritical: boolean;
  severity: string;
}

export interface OSCEEvaluationResultItem {
  rubricItemId: string;
  category: string;
  criterion: string;
  status: "achieved" | "partially_achieved" | "not_achieved" | "not_applicable" | "insufficient_evidence";
  marksAwarded: number;
  maximumMarks: number;
  evidence?: string | null;
  feedback?: string | null;
  isCritical: boolean;
}

export interface OSCEEvaluationResult {
  summary: string;
  strengths: string[];
  improvements: string[];
  score: number;
  totalMarks: number;
  percentage: number;
  hasCriticalFailure: boolean;
  outcome: "passed" | "not_passed" | "review_required";
  items: OSCEEvaluationResultItem[];
  categoryBreakdown: Record<string, { marksAwarded: number; maximumMarks: number; percentage: number }>;
}

export class OSCEEvaluationEngine {
  /**
   * Deterministically evaluates student OSCE consultation against structured rubric items.
   */
  public static evaluateStation(params: {
    stationTitle: string;
    passingScore: number;
    rubricItems: OSCERubricItemInput[];
    messages: Array<{ sender: string; message: string; timestamp?: any }>;
  }): OSCEEvaluationResult {
    const { stationTitle, passingScore, rubricItems, messages } = params;

    const studentMessages = messages.filter((m) => m.sender === "student" || m.sender === "candidate");
    const evaluatedItems: OSCEEvaluationResultItem[] = [];
    const categoryStats: Record<string, { marksAwarded: number; maximumMarks: number }> = {};

    let totalAwarded = 0;
    let totalMaximum = 0;
    let hasCriticalFailure = false;

    for (const item of rubricItems) {
      const match = this.evaluateSingleItem(item, studentMessages);
      evaluatedItems.push(match);

      totalAwarded += match.marksAwarded;
      totalMaximum += match.maximumMarks;

      if (!categoryStats[item.category]) {
        categoryStats[item.category] = { marksAwarded: 0, maximumMarks: 0 };
      }
      categoryStats[item.category].marksAwarded += match.marksAwarded;
      categoryStats[item.category].maximumMarks += match.maximumMarks;

      if (item.isCritical && match.status === "not_achieved") {
        hasCriticalFailure = true;
      }
    }

    const percentage = totalMaximum > 0 ? Math.round((totalAwarded / totalMaximum) * 1000) / 10 : 0;

    let outcome: "passed" | "not_passed" | "review_required" = "passed";
    if (hasCriticalFailure) {
      outcome = "review_required";
    } else if (totalAwarded < passingScore) {
      outcome = "not_passed";
    }

    // Build Category Breakdown
    const categoryBreakdown: Record<string, { marksAwarded: number; maximumMarks: number; percentage: number }> = {};
    for (const [cat, stats] of Object.entries(categoryStats)) {
      categoryBreakdown[cat] = {
        marksAwarded: Math.round(stats.marksAwarded * 10) / 10,
        maximumMarks: Math.round(stats.maximumMarks * 10) / 10,
        percentage: stats.maximumMarks > 0 ? Math.round((stats.marksAwarded / stats.maximumMarks) * 100) : 0,
      };
    }

    // Generate evidence-based strengths
    const strengths: string[] = [];
    for (const item of evaluatedItems) {
      if (item.status === "achieved" && item.evidence) {
        strengths.push(`Demonstrated ${item.criterion.toLowerCase()} by asking: "${item.evidence}"`);
      }
      if (strengths.length >= 4) break;
    }
    if (strengths.length === 0) {
      strengths.push("Initiated patient consultation within the allocated time.");
    }

    // Generate specific areas for improvement
    const improvements: string[] = [];
    for (const item of evaluatedItems) {
      if (item.status === "not_achieved") {
        const prefix = item.isCritical ? "[Critical Safety Item] " : "";
        improvements.push(`${prefix}Did not explore ${item.criterion.toLowerCase()}. Remember to systematically address this in clinical practice.`);
      }
      if (improvements.length >= 4) break;
    }
    if (improvements.length === 0) {
      improvements.push("Maintain systematic time management to allow deeper inquiry into patient concerns.");
    }

    const summary = `Completed ${stationTitle}. Achieved ${totalAwarded.toFixed(1)} / ${totalMaximum.toFixed(1)} marks (${percentage}%).${
      hasCriticalFailure ? " One or more critical safety criteria were omitted, requiring clinical review." : ""
    }`;

    return {
      summary,
      strengths,
      improvements,
      score: Math.round(totalAwarded * 10) / 10,
      totalMarks: Math.round(totalMaximum * 10) / 10,
      percentage,
      hasCriticalFailure,
      outcome,
      items: evaluatedItems,
      categoryBreakdown,
    };
  }

  private static evaluateSingleItem(
    item: OSCERubricItemInput,
    studentMessages: Array<{ sender: string; message: string }>
  ): OSCEEvaluationResultItem {
    const intent = (item.intent || "").toLowerCase();
    const criterion = item.criterion.toLowerCase();

    // Check across all student messages
    let bestMatchStatus: "achieved" | "partially_achieved" | "not_achieved" = "not_achieved";
    let matchedQuote: string | null = null;

    for (const msg of studentMessages) {
      const text = msg.message.toLowerCase();

      const isMatch = this.matchesIntent(text, intent, criterion);
      if (isMatch === "achieved") {
        bestMatchStatus = "achieved";
        matchedQuote = msg.message.trim();
        break;
      } else if (isMatch === "partially_achieved" && bestMatchStatus === "not_achieved") {
        bestMatchStatus = "partially_achieved";
        matchedQuote = msg.message.trim();
      }
    }

    let marksAwarded = 0;
    let feedback = "";

    if (bestMatchStatus === "achieved") {
      marksAwarded = item.marks;
      feedback = `Competently addressed ${item.criterion.toLowerCase()}.`;
    } else if (bestMatchStatus === "partially_achieved") {
      marksAwarded = Math.round((item.marks * 0.5) * 10) / 10;
      feedback = `Partially addressed ${item.criterion.toLowerCase()}. Explore further detail.`;
    } else {
      marksAwarded = 0;
      feedback = item.isCritical
        ? `CRITICAL: Missed essential safety criterion: ${item.criterion}.`
        : `Omitted inquiry into ${item.criterion.toLowerCase()}.`;
    }

    return {
      rubricItemId: item.id,
      category: item.category,
      criterion: item.criterion,
      status: bestMatchStatus,
      marksAwarded,
      maximumMarks: item.marks,
      evidence: matchedQuote,
      feedback,
      isCritical: item.isCritical,
    };
  }

  private static matchesIntent(
    text: string,
    intent: string,
    criterion: string
  ): "achieved" | "partially_achieved" | "not_achieved" {
    // 1. Introduction & Consent
    if (intent === "introduction" || criterion.includes("introduc")) {
      if (
        text.includes("hello") ||
        text.includes("hi") ||
        text.includes("name") ||
        text.includes("doctor") ||
        text.includes("dr") ||
        text.includes("student") ||
        text.includes("কেমন আছেন") ||
        text.includes("ডাক্তার") ||
        text.includes("নাম")
      ) {
        return "achieved";
      }
    }

    if (intent === "consent" || criterion.includes("consent") || criterion.includes("confirm patient")) {
      if (
        text.includes("consent") ||
        text.includes("okay if") ||
        text.includes("permission") ||
        text.includes("ask you some questions") ||
        text.includes("talk with you") ||
        text.includes("কথা বলতে পারি") ||
        text.includes("অনুমতি")
      ) {
        return "achieved";
      }
      if (text.includes("how can i help") || text.includes("কীভাবে সাহায্য")) {
        return "partially_achieved";
      }
    }

    // 2. Pain Onset / Temporal
    if (intent === "pain_onset" || intent === "headache_temporal" || criterion.includes("onset") || criterion.includes("timing")) {
      if (
        text.includes("when") ||
        text.includes("start") ||
        text.includes("begin") ||
        text.includes("how long") ||
        text.includes("duration") ||
        text.includes("days") ||
        text.includes("hours") ||
        text.includes("sudden") ||
        text.includes("gradual") ||
        text.includes("কবে") ||
        text.includes("কখন") ||
        text.includes("কতদিন") ||
        text.includes("শুরু")
      ) {
        return "achieved";
      }
    }

    // 3. Pain Location & Radiation
    if (intent === "pain_radiation" || criterion.includes("radiation") || criterion.includes("jaw") || criterion.includes("arm")) {
      if (
        text.includes("radiat") ||
        text.includes("spread") ||
        text.includes("move") ||
        text.includes("travel") ||
        text.includes("arm") ||
        text.includes("jaw") ||
        text.includes("neck") ||
        text.includes("back") ||
        text.includes("shoulder") ||
        text.includes("ছড়ায়") ||
        text.includes("হাতে") ||
        text.includes("ঘাড়ে") ||
        text.includes("পিঠে")
      ) {
        return "achieved";
      }
      if (text.includes("where") || text.includes("কোথায়")) {
        return "partially_achieved";
      }
    }

    // 4. Pain Character & Severity
    if (intent === "pain_character_severity" || intent === "headache_character" || criterion.includes("character") || criterion.includes("severity") || criterion.includes("scale")) {
      if (
        text.includes("scale") ||
        text.includes("1 to 10") ||
        text.includes("1-10") ||
        text.includes("rate") ||
        text.includes("how bad") ||
        text.includes("sharp") ||
        text.includes("dull") ||
        text.includes("crushing") ||
        text.includes("tight") ||
        text.includes("burning") ||
        text.includes("throbbing") ||
        text.includes("pulsating") ||
        text.includes("১ থেকে ১০") ||
        text.includes("মাত্রা কেমন") ||
        text.includes("ব্যথা কেমন") ||
        text.includes("চাপ") ||
        text.includes("তীক্ষ্ণ")
      ) {
        return "achieved";
      }
      if (text.includes("describe the pain") || text.includes("ব্যথাটা বলুন")) {
        return "partially_achieved";
      }
    }

    // 5. Aggravating & Relieving
    if (intent === "pain_aggravating_relieving" || criterion.includes("aggravat") || criterion.includes("reliev")) {
      if (
        text.includes("worse") ||
        text.includes("better") ||
        text.includes("reliev") ||
        text.includes("aggravat") ||
        text.includes("walking") ||
        text.includes("exertion") ||
        text.includes("rest") ||
        text.includes("medicine") ||
        text.includes("বাড়ে") ||
        text.includes("কমে") ||
        text.includes("বিশ্রাম") ||
        text.includes("হাঁটলে")
      ) {
        return "achieved";
      }
    }

    // 6. Cardiac Red Flags (Diaphoresis, Dyspnea, Presyncope)
    if (intent === "associated_diaphoresis_dyspnea" || criterion.includes("diaphoresis") || criterion.includes("sweating")) {
      if (
        text.includes("sweat") ||
        text.includes("perspir") ||
        text.includes("breath") ||
        text.includes("short of breath") ||
        text.includes("ঘাম") ||
        text.includes("শ্বাস") ||
        text.includes("দম")
      ) {
        return "achieved";
      }
    }

    if (intent === "associated_nausea_presyncope" || criterion.includes("nausea") || criterion.includes("palpitation")) {
      if (
        text.includes("nausea") ||
        text.includes("vomit") ||
        text.includes("dizzy") ||
        text.includes("faint") ||
        text.includes("lighthead") ||
        text.includes("palpitat") ||
        text.includes("বমি") ||
        text.includes("মাথা ঘোরা") ||
        text.includes("বুক ধড়ফড়")
      ) {
        return "achieved";
      }
    }

    // 7. Cardiac Risk Factors
    if (intent === "cardiac_risk_factors" || criterion.includes("risk factors") || criterion.includes("hypertension")) {
      if (
        text.includes("pressure") ||
        text.includes("hypertension") ||
        text.includes("diabetes") ||
        text.includes("sugar") ||
        text.includes("cholesterol") ||
        text.includes("lipid") ||
        text.includes("heart problem") ||
        text.includes("heart attack") ||
        text.includes("পেশার") ||
        text.includes("প্রেশার") ||
        text.includes("ডায়াবেটিস") ||
        text.includes("হার্ট")
      ) {
        return "achieved";
      }
    }

    // 8. Medications & Smoking
    if (intent === "medications_and_smoking" || intent === "medication_use" || criterion.includes("medication") || criterion.includes("smoking")) {
      if (
        text.includes("medic") ||
        text.includes("drug") ||
        text.includes("tablet") ||
        text.includes("smok") ||
        text.includes("cigarette") ||
        text.includes("tobacco") ||
        text.includes("ওষুধ") ||
        text.includes("ধূমপান") ||
        text.includes("সিগারেট")
      ) {
        return "achieved";
      }
    }

    // 9. Neurological / Headache Red Flags (Thunderclap, Meningism, Deficits)
    if (intent === "red_flag_thunderclap" || criterion.includes("thunderclap") || criterion.includes("worst headache")) {
      if (
        text.includes("worst") ||
        text.includes("thunder") ||
        text.includes("clap") ||
        text.includes("sudden") ||
        text.includes("peak") ||
        text.includes("severest") ||
        text.includes("জীবনের সবচেয়ে খারাপ") ||
        text.includes("হঠাৎ তীব্র")
      ) {
        return "achieved";
      }
    }

    if (intent === "red_flag_meningism_deficits" || criterion.includes("neck stiffness") || criterion.includes("neurological")) {
      if (
        text.includes("neck") ||
        text.includes("stiff") ||
        text.includes("fever") ||
        text.includes("weakness") ||
        text.includes("numb") ||
        text.includes("vision") ||
        text.includes("rash") ||
        text.includes("ঘাড়") ||
        text.includes("শক্ত") ||
        text.includes("জ্বর") ||
        text.includes("দুর্বলতা") ||
        text.includes("ঝাপসা")
      ) {
        return "achieved";
      }
    }

    // 10. Migraine features & triggers
    if (intent === "migraine_features" || intent === "aura_exploration" || criterion.includes("photophobia") || criterion.includes("aura")) {
      if (
        text.includes("light") ||
        text.includes("sound") ||
        text.includes("photo") ||
        text.includes("phono") ||
        text.includes("aura") ||
        text.includes("flash") ||
        text.includes("zigzag") ||
        text.includes("nausea") ||
        text.includes("আলো") ||
        text.includes("শব্দ") ||
        text.includes("চোখে কিছু দেখা")
      ) {
        return "achieved";
      }
    }

    if (intent === "headache_triggers" || criterion.includes("trigger")) {
      if (
        text.includes("trigger") ||
        text.includes("screen") ||
        text.includes("sleep") ||
        text.includes("stress") ||
        text.includes("coffee") ||
        text.includes("caffeine") ||
        text.includes("meal") ||
        text.includes("food") ||
        text.includes("ঘুম") ||
        text.includes("টেনশন") ||
        text.includes("স্ক্রিন")
      ) {
        return "achieved";
      }
    }

    // 11. Abdominal Pain (Migration, Peritoneal, Gynecological LMP)
    if (intent === "pain_migration" || criterion.includes("migration") || criterion.includes("iliac")) {
      if (
        text.includes("move") ||
        text.includes("shift") ||
        text.includes("migrat") ||
        text.includes("belly button") ||
        text.includes("navel") ||
        text.includes("umbilic") ||
        text.includes("right side") ||
        text.includes("lower right") ||
        text.includes("নাভি") ||
        text.includes("ডান পাশে") ||
        text.includes("সরে গেছে")
      ) {
        return "achieved";
      }
      if (text.includes("where") || text.includes("কোথায়")) {
        return "partially_achieved";
      }
    }

    if (intent === "peritoneal_irritation_clues" || criterion.includes("peritoneal") || criterion.includes("coughing")) {
      if (
        text.includes("cough") ||
        text.includes("movement") ||
        text.includes("bump") ||
        text.includes("walk") ||
        text.includes("কাশি") ||
        text.includes("নড়াচড়া") ||
        text.includes("ঝাঁকুনি")
      ) {
        return "achieved";
      }
    }

    if (intent === "gyne_lmp_screen" || criterion.includes("period") || criterion.includes("menstrual") || criterion.includes("lmp") || criterion.includes("pregnancy")) {
      if (
        text.includes("period") ||
        text.includes("menstru") ||
        text.includes("lmp") ||
        text.includes("last period") ||
        text.includes("pregnan") ||
        text.includes("মাসিক") ||
        text.includes("পিরিয়ড") ||
        text.includes("গর্ভবতী")
      ) {
        return "achieved";
      }
    }

    if (intent === "anorexia_vomiting" || intent === "bowel_and_urinary" || criterion.includes("appetite") || criterion.includes("bowel")) {
      if (
        text.includes("appetite") ||
        text.includes("eat") ||
        text.includes("hungry") ||
        text.includes("vomit") ||
        text.includes("stool") ||
        text.includes("diarrhea") ||
        text.includes("constipat") ||
        text.includes("urin") ||
        text.includes("খিদে") ||
        text.includes("বমি") ||
        text.includes("পায়খানা") ||
        text.includes("প্রস্রাব")
      ) {
        return "achieved";
      }
    }

    // 12. Dyspnea (Orthopnea, PND, Edema, Sputum, Hemoptysis)
    if (intent === "orthopnea_pnd" || criterion.includes("orthopnea") || criterion.includes("pillow") || criterion.includes("pnd")) {
      if (
        text.includes("pillow") ||
        text.includes("lie flat") ||
        text.includes("lying down") ||
        text.includes("wake up") ||
        text.includes("night") ||
        text.includes("gasp") ||
        text.includes("orthopnea") ||
        text.includes("বালিশ") ||
        text.includes("শুয়ে থাকলে") ||
        text.includes("রাতে ঘুম ভেঙে")
      ) {
        return "achieved";
      }
    }

    if (intent === "peripheral_edema" || criterion.includes("edema") || criterion.includes("ankle") || criterion.includes("swelling")) {
      if (
        text.includes("swell") ||
        text.includes("ankle") ||
        text.includes("feet") ||
        text.includes("foot") ||
        text.includes("leg") ||
        text.includes("edema") ||
        text.includes("ফোলা") ||
        text.includes("পা ফুলে")
      ) {
        return "achieved";
      }
    }

    if (intent === "respiratory_red_flags" || criterion.includes("hemoptysis") || criterion.includes("blood in sputum")) {
      if (
        text.includes("blood") ||
        text.includes("cough blood") ||
        text.includes("chest pain") ||
        text.includes("faint") ||
        text.includes("collapse") ||
        text.includes("রক্ত") ||
        text.includes("কাশির সাথে রক্ত")
      ) {
        return "achieved";
      }
    }

    // 13. Fever (Dengue warning signs, bleeding, fluid, mosquito)
    if (intent === "bleeding_warning_signs" || criterion.includes("bleeding") || criterion.includes("epistaxis")) {
      if (
        text.includes("bleed") ||
        text.includes("gum") ||
        text.includes("nose") ||
        text.includes("stool") ||
        text.includes("black") ||
        text.includes("red spot") ||
        text.includes("rash") ||
        text.includes("রক্তক্ষরণ") ||
        text.includes("দাঁতের মাড়ি") ||
        text.includes("নাক দিয়ে রক্ত") ||
        text.includes("কালো পায়খানা")
      ) {
        return "achieved";
      }
    }

    if (intent === "hemodynamic_warning_signs" || criterion.includes("urine output") || criterion.includes("vomiting")) {
      if (
        text.includes("urine") ||
        text.includes("water") ||
        text.includes("drink") ||
        text.includes("fluid") ||
        text.includes("vomit") ||
        text.includes("stomach pain") ||
        text.includes("প্রস্রাব") ||
        text.includes("পানি খাওয়া") ||
        text.includes("পেট ব্যথা") ||
        text.includes("বমি")
      ) {
        return "achieved";
      }
    }

    if (intent === "mosquito_travel_exposure" || criterion.includes("mosquito") || criterion.includes("travel")) {
      if (
        text.includes("mosquito") ||
        text.includes("bite") ||
        text.includes("dengue") ||
        text.includes("travel") ||
        text.includes("visit") ||
        text.includes("মশা") ||
        text.includes("ডেঙ্গু") ||
        text.includes("ভ্রমণ")
      ) {
        return "achieved";
      }
    }

    // 14. Patient-Centeredness & ICE
    if (intent === "ice_exploration" || intent === "patient_concerns" || criterion.includes("ice") || criterion.includes("concern") || criterion.includes("ideas")) {
      if (
        text.includes("worry") ||
        text.includes("concern") ||
        text.includes("think is happening") ||
        text.includes("expect") ||
        text.includes("scared") ||
        text.includes("hope") ||
        text.includes("চিন্তা") ||
        text.includes("ভয়") ||
        text.includes("কী মনে হয়")
      ) {
        return "achieved";
      }
    }

    // 15. Closing & Empathy
    if (intent === "closing_summary" || intent === "empathy_and_closing" || criterion.includes("closing") || criterion.includes("summary") || criterion.includes("empath")) {
      if (
        text.includes("summar") ||
        text.includes("review") ||
        text.includes("let me make sure") ||
        text.includes("thank you") ||
        text.includes("we will take care") ||
        text.includes("don't worry") ||
        text.includes("understand") ||
        text.includes("ধন্যবাদ") ||
        text.includes("সারসংক্ষেপ") ||
        text.includes("চিন্তা করবেন না")
      ) {
        return "achieved";
      }
    }

    // Generic fallback for any other clinical criteria: search for overlap of key nouns
    const criterionWords = criterion.split(" ").filter((w) => w.length > 4 && !["about", "which", "there", "patient", "explore"].includes(w));
    let matchCount = 0;
    for (const word of criterionWords) {
      if (text.includes(word)) {
        matchCount++;
      }
    }

    if (matchCount >= 2) {
      return "achieved";
    } else if (matchCount === 1) {
      return "partially_achieved";
    }

    return "not_achieved";
  }
}