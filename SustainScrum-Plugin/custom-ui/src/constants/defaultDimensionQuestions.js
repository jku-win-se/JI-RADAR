/** Fallback when SuMM has no saved questions (must match server defaults). */
export const DEFAULT_DIMENSION_QUESTIONS = {
    environment: [
        'How does this feature impact energy consumption?',
        'What is the resource usage of this feature?',
        'How does this feature affect emissions?',
        'What is the environmental footprint of this feature?'
    ],
    society: [
        'How does this feature impact user accessibility?',
        'What is the social inclusiveness of this feature?',
        'How does this feature affect user privacy?',
        'What is the societal benefit of this feature?'
    ],
    economy: [
        'How does this feature impact operational costs?',
        'What is the economic efficiency of this feature?',
        'How does this feature affect long-term maintenance costs?',
        'What is the economic value of this feature?'
    ],
    individual: [
        'How does this feature impact individual well-being?',
        'What is the personal benefit of this feature?',
        'How does this feature affect work-life balance?',
        'What is the individual value of this feature?'
    ],
    technical: [
        'How does this feature impact technical debt?',
        'What is the technical quality of this feature?',
        'How does this feature affect system maintainability?',
        'What is the technical sustainability of this feature?'
    ]
};

export function questionsForDimensionId(summData, dimId) {
    const fromSumm = summData?.dimensionQuestions?.[dimId];
    if (Array.isArray(fromSumm) && fromSumm.length > 0) return fromSumm;
    return DEFAULT_DIMENSION_QUESTIONS[dimId] || ['Rate the sustainability impact for this dimension.'];
}
