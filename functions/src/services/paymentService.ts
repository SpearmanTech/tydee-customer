// ❌ REMOVE: import { getFunctions, httpsCallable } from 'firebase/functions';
// ✅ ADD: Import your logic directly from the files they live in
import { verifyAndSaveCard, chargeSavedCard as chargeFunc } from "../payments/paystack";

export const paymentService = {
  /**
   * Links a card by calling the local function logic directly
   */
  linkCard: async (userId: string, reference: string) => {
    // Instead of httpsCallable, we just call the function logic
    // We mock the 'data' structure to match what the function expects
    const result = await verifyAndSaveCard.run({ 
      data: { userId, reference } 
    } as any);
    
    return result;
  },

  /**
   * Charges a saved card directly
   */
  chargeSavedCard: async (userId: string, amount: number, jobId: string) => {
    const result = await chargeFunc.run({ 
      data: { userId, amount, jobId } 
    } as any);
    
    return result;
  }
};