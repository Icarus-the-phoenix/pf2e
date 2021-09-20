import {
    DieRoll,
    DegreeAdjustment,
    DegreeAdjustmentValues,
    DegreeOfSuccess,
    calculateDegreeOfSuccess,
    adjustDegreeOfSuccess,
} from "../degree-of-success";
import { PredicatePF2e } from "./predication";
import { RollDataPF2e } from "./rolls";

type CheckDCStrings = "one-degree-better" | "one-degree-worse" | "two-degrees-better" | "two-degrees-worse";

export interface CheckDCModifiers {
    all?: CheckDCStrings;
    criticalFailure?: CheckDCStrings;
    failure?: CheckDCStrings;
    success?: CheckDCStrings;
    criticalSuccess?: CheckDCStrings;
}

export interface DegreeOfSuccessAdjustment {
    modifiers: CheckDCModifiers;
    predicate?: PredicatePF2e;
}

export interface CheckDC {
    label?: string;
    modifiers?: CheckDCModifiers;
    scope?: "AttackOutcome" | "CheckOutcome";
    adjustments?: DegreeOfSuccessAdjustment[];
    value: number;
    visibility?: "none" | "gm" | "owner" | "all";
}

const PREFIXES = Object.freeze({
    all: -1 as const,
    criticalFailure: DegreeOfSuccess.CRITICAL_FAILURE,
    failure: DegreeOfSuccess.FAILURE,
    success: DegreeOfSuccess.SUCCESS,
    criticalSuccess: DegreeOfSuccess.CRITICAL_SUCCESS,
});

const ADJUSTMENTS = Object.freeze({
    "two-degrees-better": DegreeAdjustment.INCREASE_BY_TWO,
    "one-degree-better": DegreeAdjustment.INCREASE,
    "one-degree-worse": DegreeAdjustment.LOWER,
    "two-degrees-worse": DegreeAdjustment.LOWER_BY_TWO,
});

export const DegreeOfSuccessText = ["criticalFailure", "failure", "success", "criticalSuccess"] as const;
export type DegreeOfSuccessString = typeof DegreeOfSuccessText[number];

export function getDegreeOfSuccess(
    roll: Roll<RollDataPF2e>,
    checkDC: CheckDC
): { unadjusted: DegreeOfSuccess; value: DegreeOfSuccess; degreeAdjustment: DegreeAdjustmentValues | undefined } {
    const dieRoll: DieRoll = {
        dieValue: Number(roll.terms[0].total) ?? 0,
        modifier: roll.data.totalModifier ?? 0,
    };
    const unadjusted = calculateDegreeOfSuccess(dieRoll, checkDC.value);
    let value = unadjusted;
    const degreeAdjustment = getDegreeAdjustment(value, checkDC.modifiers ?? {});
    if (degreeAdjustment !== undefined) {
        value = adjustDegreeOfSuccess(degreeAdjustment, value);
    }
    return {
        unadjusted,
        value,
        degreeAdjustment,
    };
}

function getDegreeAdjustment(value: DegreeOfSuccess, modifiers: CheckDCModifiers): DegreeAdjustmentValues | undefined {
    for (const degree of ["all", "criticalFailure", "failure", "success", "criticalSuccess"] as const) {
        const checkDC = modifiers[degree];
        if (!checkDC) continue;
        const condition = PREFIXES[degree];
        const adjustment = ADJUSTMENTS[checkDC];
        if (
            !(value === DegreeOfSuccess.CRITICAL_SUCCESS && adjustment === DegreeAdjustment.INCREASE) &&
            !(value === DegreeOfSuccess.CRITICAL_FAILURE && adjustment === DegreeAdjustment.LOWER)
        ) {
            if (condition === PREFIXES.all) {
                // always return the adjustment
                return adjustment;
            }
            if (value === condition) {
                // return the adjustment for the first matching modifier
                return adjustment;
            }
        }
    }
    return;
}
