const express = require('express');
const router = express.Router();
const Review = require('../models/Review');

// Delete review route
router.delete('/:id', async (req, res) => {
    try {
        console.log('Attempting to delete review:', req.params.id);
        const review = await Review.findByIdAndDelete(req.params.id);
        
        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        console.log('Review deleted successfully');
        res.json({ success: true });
        
    } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({ success: false, message: 'Error deleting review' });
    }
});

module.exports = router;