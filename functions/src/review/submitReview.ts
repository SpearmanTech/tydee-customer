import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";

// Initialize admin only once if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}

export const submitReview = functions.https.onCall(async (request) => {
  // 1. Ensure the user is authenticated (Optional, but recommended if your web app requires login)
  // if (!request.auth) {
  //   throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to leave a review.');
  // }

  const { jobId, proId, rating, comment } = request.data;

  if (!jobId || !proId || typeof rating !== 'number') {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required review data.');
  }

  try {
    // 2. Save the individual review to a 'reviews' collection
    await admin.firestore().collection('reviews').add({
      jobId,
      proId,
      // customerId: request.auth?.uid || "anonymous", // Uncomment if requiring auth
      rating,
      comment: comment || "",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 3. Mark the job as reviewed so the customer can't rate the same job twice
    await admin.firestore().collection('jobs').doc(jobId).update({
      isReviewed: true
    });

    // 4. Update the Pro's aggregate rating
    // This fetches all reviews for the Pro and recalculates their average score
    const reviewsSnap = await admin.firestore().collection('reviews').where('proId', '==', proId).get();
    
    let totalScore = 0;
    const totalReviews = reviewsSnap.size;

    reviewsSnap.forEach((doc) => {
      totalScore += doc.data().rating;
    });

    const averageRating = totalReviews > 0 ? (totalScore / totalReviews).toFixed(1) : rating;

    // Save the new average back to the Pro's profile
    await admin.firestore().collection('professionals').doc(proId).update({
      rating: parseFloat(averageRating as string),
      reviewCount: totalReviews
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to submit review:", error);
    throw new functions.https.HttpsError('internal', 'Could not save the review.');
  }
});