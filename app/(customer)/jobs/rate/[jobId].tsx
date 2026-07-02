import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function RateProPage() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get('jobId');
  const proId = searchParams.get('proId');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const submitReview = async () => {
    // Call your Firebase function here
    // e.g., await submitReviewFunction({ jobId, proId, rating, comment })
    alert("Thank you for your feedback!");
  };

  return (
    <div className="container">
      <h1>Rate your experience</h1>
      {/* 5 Star UI goes here */}
      <textarea onChange={(e) => setComment(e.target.value)} />
      <button onClick={submitReview}>Submit Review</button>
    </div>
  );
}