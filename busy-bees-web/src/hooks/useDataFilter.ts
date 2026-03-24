import { useMemo } from 'react';

export type FilterOperator =
    | 'contains'
    | 'equals'
    | 'startsWith'
    | 'endsWith'
    | 'isEmpty'
    | 'isNotEmpty'
    | 'in'; // For faceted filters

export interface FilterRule {
    id: string; // Unique ID for UI tracking
    columnId: string; // The object key to filter against
    operator: FilterOperator;
    value: any; // Can be string, number, or array of strings (for 'in')
}

export type MatchType = 'AND' | 'OR';

interface UseDataFilterOptions<T> {
    data: T[];
    rules: FilterRule[];
    matchType: MatchType;
}

export function useDataFilter<T extends Record<string, any>>({
    data,
    rules,
    matchType
}: UseDataFilterOptions<T>): T[] {

    return useMemo(() => {
        // Optimization: If no rules, return ALL data immediately
        if (!rules || rules.length === 0) {
            return data;
        }

        return data.filter((row) => {
            const evaluateRule = (rule: FilterRule): boolean => {
                const cellValue = row[rule.columnId];

                // Handle undefined/null specifically for empty checks
                if (rule.operator === 'isEmpty') {
                    return cellValue === undefined || cellValue === null || cellValue === '';
                }
                if (rule.operator === 'isNotEmpty') {
                    return cellValue !== undefined && cellValue !== null && cellValue !== '';
                }

                // If cell is empty but operator isn't explicitly checking for it, it fails comparison
                if (cellValue === undefined || cellValue === null) {
                    return false;
                }

                const strCellValue = String(cellValue).toLowerCase();

                if (rule.operator === 'in') {
                    // For faceted, value should be an array or Set. Let's assume array of strings
                    if (Array.isArray(rule.value)) {
                        if (rule.value.length === 0) return true; // Empty facet means no filter applied for this column
                        return rule.value.some(v => String(v).toLowerCase() === strCellValue);
                    }
                    return false;
                }

                const strRuleValue = String(rule.value || '').toLowerCase();

                switch (rule.operator) {
                    case 'contains':
                        return strCellValue.includes(strRuleValue);
                    case 'equals':
                        return strCellValue === strRuleValue;
                    case 'startsWith':
                        return strCellValue.startsWith(strRuleValue);
                    case 'endsWith':
                        return strCellValue.endsWith(strRuleValue);
                    default:
                        return true; // Unknown operator, fail-safe to show data
                }
            };

            if (matchType === 'AND') {
                return rules.every(evaluateRule);
            } else { // 'OR'
                return rules.some(evaluateRule);
            }
        });

    }, [data, rules, matchType]);
}
