import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();

export const paymentService = {
  /**
   * Links a card by verifying the reference from Paystack
   */
  linkCard: async (userId: string, reference: string) => {
    const verifyFunc = httpsCallable(functions, 'verifyAndSaveCard');
    const result = await verifyFunc({ userId, reference });
    return result.data;
  },

  /**
   * Charges a saved card in the background (The Uber Moment)
   */
  chargeSavedCard: async (userId: string, amount: number, jobId: string) => {
    const chargeFunc = httpsCallable(functions, 'chargeSavedCard');
    const result = await chargeFunc({ userId, amount, jobId });
    return result.data;
  }
};