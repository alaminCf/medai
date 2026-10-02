import { VivaBlueprint, VivaConcept } from './vivaTypes';
import { LearningAIService } from '../learningAIService';

export class VivaBlueprintService {
  private static CURATED_BLUEPRINTS: Record<string, VivaBlueprint> = {
    // 1. Cardiovascular System: Cardiac Cycle & Hemodynamics
    'cardiovascular system': {
      subject: 'Physiology',
      topic: 'Cardiovascular System',
      overview: 'Mechanical events of the cardiac cycle, ventricular volumes, pressure-volume loops, and hemodynamic regulation.',
      concepts: [
        {
          id: 'cv_cardiac_cycle',
          name: 'Cardiac Cycle Phases & Heart Sounds',
          subtopic: 'Ventricular Mechanics',
          learningObjective: 'Differentiate isovolumetric contraction, rapid ejection, and isovolumetric relaxation with associated heart sounds (S1, S2).',
          tier: 'FOUNDATIONAL',
          difficulty: 'Basic',
          expectedConcepts: ['isovolumetric contraction', 'AV valve closure', 'S1 sound', 'isovolumetric relaxation', 'semilunar valve closure', 'S2 sound'],
          acceptedKeywords: ['systole', 'diastole', 'mitral', 'tricuspid', 'aortic', 'pulmonary', 's1', 's2', 'ventricle', 'pressure'],
          commonMisconceptions: [
            {
              misconception: 'Isovolumetric contraction occurs with open aortic valve.',
              correction: 'During isovolumetric contraction, all four valves are closed because ventricular pressure has not yet exceeded aortic pressure.',
              probeQuestion: 'During isovolumetric contraction, what is the status of the aortic valve, and why does ventricular volume remain unchanged?'
            },
            {
              misconception: 'S2 is caused by ventricular contraction.',
              correction: 'S2 is caused by the sudden closure of the aortic and pulmonic valves at the onset of diastole.',
              probeQuestion: 'What mechanical event directly produces the second heart sound (S2)?'
            }
          ],
          followUpPossibilities: [
            'What causes physiological splitting of S2 during inspiration?',
            'How does the ventricular pressure-volume loop change in aortic stenosis?'
          ],
          relatedConcepts: ['cv_cardiac_output', 'cv_preload']
        },
        {
          id: 'cv_cardiac_output',
          name: 'Cardiac Output & Calculation',
          subtopic: 'Hemodynamics',
          learningObjective: 'Define cardiac output, state its physiological equation (CO = HR x SV), and normal resting values.',
          tier: 'CORE_MECHANISM',
          difficulty: 'Basic',
          expectedConcepts: ['stroke volume multiplied by heart rate', 'volume pumped by one ventricle per minute', 'normal resting value 4-6 L/min'],
          acceptedKeywords: ['stroke volume', 'heart rate', 'sv', 'hr', 'liters per minute', 'ventricle', 'ejection'],
          commonMisconceptions: [
            {
              misconception: 'Cardiac output is the total blood pumped by both ventricles combined.',
              correction: 'Cardiac output refers to the volume pumped by ONE ventricle (usually left ventricle) per minute; both ventricles pump equal volume in series.',
              probeQuestion: 'Does cardiac output refer to both ventricles combined or the output of one ventricle per minute?'
            }
          ],
          followUpPossibilities: [
            'What three primary factors govern stroke volume?',
            'If heart rate increases to 180 bpm in extreme tachycardia, why might cardiac output actually decline?'
          ],
          relatedConcepts: ['cv_preload', 'cv_afterload', 'cv_contractility']
        },
        {
          id: 'cv_preload',
          name: 'Preload & Frank-Starling Law',
          subtopic: 'Ventricular Filling',
          learningObjective: 'Define preload in terms of end-diastolic wall stress and fiber length, and describe the Frank-Starling mechanism.',
          tier: 'REGULATION',
          difficulty: 'Intermediate',
          expectedConcepts: ['end-diastolic volume/pressure', 'initial myocardial sarcomere stretch', 'troponin C calcium affinity', 'optimal myofilament overlap', 'stroke volume balance'],
          acceptedKeywords: ['end-diastolic', 'sarcomere', 'stretch', 'actin', 'myosin', 'venous return', 'filling', 'frank starling'],
          commonMisconceptions: [
            {
              misconception: 'Preload is the vascular resistance the ventricle must pump against.',
              correction: 'Resistance against ejection is afterload; preload is the load or stretch on the myocardium at end-diastole before contraction begins.',
              probeQuestion: 'You are describing vascular resistance or afterload. What factor determines the initial stretch of the ventricle before systole?'
            }
          ],
          followUpPossibilities: [
            'How does acute volume infusion change the ventricular Frank-Starling operating point?',
            'What happens to ventricular compliance in long-standing concentric hypertrophy?'
          ],
          relatedConcepts: ['cv_afterload', 'cv_contractility']
        },
        {
          id: 'cv_afterload',
          name: 'Afterload & Vascular Impedance',
          subtopic: 'Vascular Resistance',
          learningObjective: 'Define afterload (Laplace wall stress during ejection) and clinical determinants like total peripheral resistance and aortic stenosis.',
          tier: 'REGULATION',
          difficulty: 'Intermediate',
          expectedConcepts: ['tension or pressure ventricle must overcome to eject blood', 'Laplace law (P x r / 2h)', 'systemic vascular resistance', 'aortic impedance'],
          acceptedKeywords: ['resistance', 'laplace', 'wall stress', 'tpr', 'aortic pressure', 'impedance', 'hypertension'],
          commonMisconceptions: [
            {
              misconception: 'Afterload only depends on blood volume in the veins.',
              correction: 'Afterload primarily depends on arterial pressure, systemic vascular resistance, and aortic valve impedance.',
              probeQuestion: 'Which arterial and systemic vascular parameters directly determine left ventricular afterload?'
            }
          ],
          followUpPossibilities: [
            'In acute severe hypertension, how does increased afterload affect stroke volume and end-systolic volume?',
            'Explain how Laplace law explains compensatory left ventricular wall thickening.'
          ],
          relatedConcepts: ['cv_preload', 'cv_clinical_heart_failure']
        },
        {
          id: 'cv_clinical_heart_failure',
          name: 'Clinical Hemodynamics in Heart Failure',
          subtopic: 'Clinical Application',
          learningObjective: 'Apply hemodynamic concepts (preload, afterload, contractility, ejection fraction) to clinical presentations of heart failure.',
          tier: 'CLINICAL_APPLICATION',
          difficulty: 'Clinical Reasoning',
          expectedConcepts: ['reduced ejection fraction', 'pulmonary capillary wedge pressure elevation', 'neurohormonal activation (RAAS, sympathetic)', 'compensatory dilation'],
          acceptedKeywords: ['ejection fraction', 'dyspnea', 'edema', 'raas', 'bnp', 's3 gallop', 'pulmonary congestion', 'inotropic'],
          commonMisconceptions: [
            {
              misconception: 'All heart failure patients have reduced ejection fraction.',
              correction: 'Heart failure with preserved ejection fraction (HFpEF) involves diastolic filling impairment despite normal EF.',
              probeQuestion: 'Can a patient present with pulmonary edema and severe heart failure symptoms despite having a normal ejection fraction? Explain the physiological mechanism.'
            }
          ],
          followUpPossibilities: [
            'Why are ACE inhibitors and beta-blockers beneficial in reducing afterload and mortality in HFrEF?',
            'What is the physiological difference between eccentric and concentric cardiac remodeling?'
          ],
          relatedConcepts: ['cv_cardiac_cycle', 'cv_preload']
        }
      ],
      clinicalScenarios: [
        {
          scenario: 'A 65-year-old hypertensive patient presents to the emergency department with severe acute dyspnea, orthopnea, and bilateral crackles on lung auscultation. Blood pressure is 210/115 mmHg.',
          leadConcept: 'cv_afterload',
          questions: [
            'How has this patient acute hypertensive crisis affected left ventricular afterload and stroke volume?',
            'Explain how the sudden rise in end-diastolic pressure leads to pulmonary edema in this patient.',
            'What physiological rationale supports using a vasodilator like intravenous nitroglycerin or nitroprusside in this situation?'
          ]
        }
      ]
    },

    // 2. Anatomy: Femoral Triangle
    'femoral triangle': {
      subject: 'Anatomy',
      topic: 'Femoral Triangle',
      overview: 'Boundaries, contents, clinical relationships, femoral canal and hernia differentiation in the femoral triangle.',
      concepts: [
        {
          id: 'anat_ft_boundaries',
          name: 'Boundaries of the Femoral Triangle',
          subtopic: 'Topographical Anatomy',
          learningObjective: 'State the superior, medial, lateral boundaries, floor, and roof of the femoral triangle.',
          tier: 'FOUNDATIONAL',
          difficulty: 'Basic',
          expectedConcepts: ['inguinal ligament superiorly', 'adductor longus medially', 'sartorius laterally', 'pectineus and iliopsoas floor', 'fascia lata roof'],
          acceptedKeywords: ['inguinal ligament', 'adductor longus', 'sartorius', 'pectineus', 'iliopsoas', 'fascia lata', 'cribriform'],
          commonMisconceptions: [
            {
              misconception: 'Gracilis forms the medial boundary.',
              correction: 'Adductor longus forms the medial border of the femoral triangle.',
              probeQuestion: 'Which muscle forms the medial boundary of the femoral triangle?'
            }
          ],
          followUpPossibilities: [
            'What structures form the muscular floor of the femoral triangle from medial to lateral?',
            'What is the clinical significance of the saphenous opening in the fascia lata?'
          ],
          relatedConcepts: ['anat_ft_contents', 'anat_ft_canal']
        },
        {
          id: 'anat_ft_contents',
          name: 'Contents and Arrangement (NAVEL)',
          subtopic: 'Neurovascular Relationships',
          learningObjective: 'Describe the arrangement of neurovascular structures in the femoral triangle from lateral to medial (Nerve, Artery, Vein, Empty space, Lymphatics).',
          tier: 'CORE_MECHANISM',
          difficulty: 'Intermediate',
          expectedConcepts: ['femoral nerve most lateral', 'femoral artery', 'femoral vein', 'femoral canal with deep inguinal lymph nodes', 'femoral sheath covering artery and vein but NOT nerve'],
          acceptedKeywords: ['femoral nerve', 'femoral artery', 'femoral vein', 'femoral sheath', 'navel', 'lymph node of cloquet', 'deep inguinal'],
          commonMisconceptions: [
            {
              misconception: 'The femoral nerve is contained inside the femoral sheath.',
              correction: 'The femoral nerve lies lateral to and OUTSIDE the femoral sheath.',
              probeQuestion: 'Is the femoral nerve enclosed within the femoral sheath? Explain the sheath compartments.'
            }
          ],
          followUpPossibilities: [
            'Why does the femoral nerve lie outside the sheath while the artery and vein lie inside?',
            'Where would you palpate the femoral pulse relative to the midinguinal point?'
          ],
          relatedConcepts: ['anat_ft_canal', 'anat_ft_clinical_hernia']
        },
        {
          id: 'anat_ft_clinical_hernia',
          name: 'Femoral Hernia & Anatomical Distinction',
          subtopic: 'Clinical Surgical Anatomy',
          learningObjective: 'Differentiate femoral hernia from inguinal hernia based on anatomical relations to the pubic tubercle and inguinal ligament.',
          tier: 'CLINICAL_APPLICATION',
          difficulty: 'Clinical Reasoning',
          expectedConcepts: ['femoral hernia emerges below and lateral to pubic tubercle', 'passes through femoral ring', 'high risk of strangulation due to rigid lacunar ligament', 'inguinal hernia is above and medial to pubic tubercle'],
          acceptedKeywords: ['pubic tubercle', 'inguinal ligament', 'femoral ring', 'lacunar ligament', 'strangulation', 'saphenous opening'],
          commonMisconceptions: [
            {
              misconception: 'Femoral hernia is more common than inguinal hernia in females in absolute terms.',
              correction: 'Inguinal hernia is still the most common hernia overall in females, but femoral hernias are more frequent in females than in males.',
              probeQuestion: 'How does the anatomical relation of a femoral hernia to the pubic tubercle distinguish it from an indirect inguinal hernia?'
            }
          ],
          followUpPossibilities: [
            'Why does a femoral hernia carry a significantly higher risk of strangulation than an inguinal hernia?',
            'What rigid ligament forms the medial boundary of the femoral ring?'
          ],
          relatedConcepts: ['anat_ft_contents']
        }
      ],
      clinicalScenarios: [
        {
          scenario: 'A 72-year-old woman presents to the acute surgical assessment unit with nausea, vomiting, abdominal distension, and a painful, irreducible lump in the right groin located inferior and lateral to the pubic tubercle.',
          leadConcept: 'anat_ft_clinical_hernia',
          questions: [
            'Based on the anatomical landmarks, is this mass more likely an inguinal or a femoral hernia?',
            'Which rigid anatomical boundary of the femoral ring is responsible for the high strangulation risk?',
            'During surgical reduction, which vessel must the surgeon be cautious of if an aberrant obturator artery is present?'
          ]
        }
      ]
    }
  };

  /**
   * Retrieves or dynamically synthesizes a complete Viva Blueprint for any medical topic
   */
  public static async getBlueprintForTopic(subject: string, topic: string): Promise<VivaBlueprint> {
    const cleanTopic = (topic || '').toLowerCase().trim();
    const cleanSubject = (subject || 'General Medicine').trim();

    // Check curated database first
    for (const [key, bp] of Object.entries(this.CURATED_BLUEPRINTS)) {
      if (cleanTopic.includes(key) || key.includes(cleanTopic)) {
        return bp;
      }
    }

    // Dynamic Blueprint Generation from Medical Curriculum logic
    const blueprint = this.generateDynamicMedicalBlueprint(cleanSubject, topic);
    return blueprint;
  }

  /**
   * Generates a 6-tier structured Concept Blueprint for arbitrary medical topics
   */
  public static generateDynamicMedicalBlueprint(subject: string, topic: string): VivaBlueprint {
    const capitalizedTopic = topic.charAt(0).toUpperCase() + topic.slice(1);

    const concepts: VivaConcept[] = [
      {
        id: 'c1_definition',
        name: `${capitalizedTopic}: Core Definition & Anatomical/Physiological Foundations`,
        learningObjective: `Define ${topic} with correct medical nomenclature and primary functional role.`,
        tier: 'FOUNDATIONAL',
        difficulty: 'Basic',
        expectedConcepts: ['Definition and core classification', 'Primary organ/system involvement', 'Normal baseline characteristics'],
        acceptedKeywords: [topic.toLowerCase(), 'normal', 'mechanism', 'structure', 'function', 'classification'],
        commonMisconceptions: [
          {
            misconception: `Confusing ${topic} with a related general clinical condition.`,
            correction: `Distinguish ${topic} by its unique structural and functional hallmarks.`,
            probeQuestion: `Can you state the precise definition of ${topic} and explain how it differs from general systemic responses?`
          }
        ],
        followUpPossibilities: [
          `What are the major structural or physiological components of ${topic}?`,
          `How is ${topic} officially classified in modern medical practice?`
        ],
        relatedConcepts: ['c2_mechanism', 'c3_regulation']
      },
      {
        id: 'c2_mechanism',
        name: `${capitalizedTopic}: Cellular & Biomechanical Mechanisms`,
        learningObjective: `Explain the step-by-step pathophysiological or physiological mechanics governing ${topic}.`,
        tier: 'CORE_MECHANISM',
        difficulty: 'Intermediate',
        expectedConcepts: ['Cellular/biochemical pathway', 'Sequential events', 'Key receptor/enzyme/anatomical landmark'],
        acceptedKeywords: ['pathway', 'mechanism', 'receptor', 'enzyme', 'activation', 'cellular'],
        commonMisconceptions: [
          {
            misconception: `Assuming single-step causation without intermediate regulation.`,
            correction: `Acknowledge the multi-step regulatory and feedback loop mechanisms.`,
            probeQuestion: `What primary cellular or biochemical trigger initiates this process in ${topic}?`
          }
        ],
        followUpPossibilities: [
          `What enzyme, receptor, or nerve pathway is rate-limiting in ${topic}?`,
          `How does cellular energy or perfusion impact this mechanism?`
        ],
        relatedConcepts: ['c1_definition', 'c3_regulation', 'c4_pathology']
      },
      {
        id: 'c3_regulation',
        name: `${capitalizedTopic}: Physiological Determinants & Compensatory Controls`,
        learningObjective: `Analyze the neurohumoral, hormonal, or biomechanical regulatory factors of ${topic}.`,
        tier: 'REGULATION',
        difficulty: 'Intermediate',
        expectedConcepts: ['Feedback control loop', 'Autonomic/hormonal influences', 'Compensatory adaptation'],
        acceptedKeywords: ['sympathetic', 'parasympathetic', 'hormone', 'feedback', 'homeostasis', 'compensation'],
        commonMisconceptions: [],
        followUpPossibilities: [
          `What happens to ${topic} when homeostatic regulation fails?`,
          `Describe the acute versus chronic compensatory response.`
        ],
        relatedConcepts: ['c2_mechanism', 'c4_pathology']
      },
      {
        id: 'c4_pathology',
        name: `${capitalizedTopic}: Pathophysiological Disruptions & Classical Presentations`,
        learningObjective: `Evaluate common disease states, complications, or injury patterns involving ${topic}.`,
        tier: 'PATHOPHYSIOLOGY',
        difficulty: 'Advanced',
        expectedConcepts: ['Etiological trigger', 'Pathological lesions', 'Classic cardinal signs and symptoms'],
        acceptedKeywords: ['etiology', 'pathology', 'dysfunction', 'symptoms', 'clinical presentation', 'triad'],
        commonMisconceptions: [],
        followUpPossibilities: [
          `What is the classic diagnostic triad or clinical hallmark for this condition?`,
          `How does acute decompensation manifest clinically?`
        ],
        relatedConcepts: ['c3_regulation', 'c5_clinical']
      },
      {
        id: 'c5_clinical',
        name: `${capitalizedTopic}: Clinical Diagnosis & Therapeutic Management`,
        learningObjective: `Formulate evidence-based diagnostic investigations and immediate management strategies for ${topic}.`,
        tier: 'CLINICAL_APPLICATION',
        difficulty: 'Clinical Reasoning',
        expectedConcepts: ['First-line diagnostic investigation', 'Gold standard confirmatory test', 'Emergency stabilization and first-line pharmacotherapy'],
        acceptedKeywords: ['investigation', 'gold standard', 'management', 'first line', 'treatment', 'drug of choice', 'surgical'],
        commonMisconceptions: [],
        followUpPossibilities: [
          `What is the initial investigation of choice, and what is the gold standard confirmatory test?`,
          `What are the dangerous complications or red-flag signs requiring urgent intervention?`
        ],
        relatedConcepts: ['c4_pathology']
      }
    ];

    return {
      subject,
      topic: capitalizedTopic,
      overview: `Oral examination blueprint covering core concepts, mechanics, regulation, and clinical diagnostic management for ${capitalizedTopic}.`,
      concepts,
      clinicalScenarios: [
        {
          scenario: `A 55-year-old patient presents to the clinic with progressive clinical findings directly related to ${capitalizedTopic}.`,
          leadConcept: 'c5_clinical',
          questions: [
            `How would you synthesize the underlying pathophysiology of ${capitalizedTopic} to explain this patient presentation?`,
            `What is your immediate diagnostic workup and first-line therapeutic intervention?`
          ]
        }
      ]
    };
  }
}
