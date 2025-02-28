function updateCartTotal(removedPrice) {
    const totalElement = document.getElementById('cart-total');
    const currentTotal = parseFloat(totalElement.textContent.replace('Total: $', ''));
    const newTotal = (currentTotal - removedPrice).toFixed(2);
    totalElement.textContent = `Total: $${newTotal}`;
}

async function removeFromCart(courseId) {
    try {
        const response = await fetch(`/remove-from-cart/${courseId}`, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            const itemElement = document.querySelector(`[data-courseid="${courseId}"]`);
            if (itemElement) {
                const priceElement = itemElement.querySelector('.price');
                const price = parseFloat(priceElement.textContent.replace('$', ''));
                itemElement.remove();
                updateCartTotal(price);
                showNotification('Course removed');
            }
            
            const remainingItems = document.querySelectorAll('.cart-item');
            if (remainingItems.length === 0) {
                window.location.reload();
            }
        } else {
            showNotification(data.message || 'Error removing course', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error removing course', 'error');
    }
}

function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 2000);
}

// PayPal integration
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('paypal-button-container')) {
        paypal.Buttons({
            createOrder: async () => {
                try {
                    const response = await fetch('/create-paypal-order', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    const data = await response.json();
                    if (data.error) {
                        throw new Error(data.error);
                    }
                    return data.orderId;
                } catch (error) {
                    console.error('Error creating order:', error);
                    showNotification('Error creating order', 'error');
                }
            },
            onApprove: async (data) => {
                try {
                    const response = await fetch('/capture-paypal-order', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            orderID: data.orderID
                        })
                    });
                    const captureData = await response.json();
                    if (captureData.status === 'COMPLETED') {
                        showNotification('Payment successful!');
                        setTimeout(() => {
                            window.location.href = '/courses';
                        }, 2000);
                    }
                } catch (error) {
                    console.error('Error capturing payment:', error);
                    showNotification('Error processing payment', 'error');
                }
            }
        }).render('#paypal-button-container');
    }
});
// Function to update cart count
function updateCartCount() {
    fetch('/cart-count')
        .then(response => response.json())
        .then(data => {
            const cartCount = document.getElementById('cart-count');
            if (cartCount) {
                cartCount.textContent = data.count;
                cartCount.style.display = data.count > 0 ? 'inline' : 'none';
            }
        })
        .catch(error => console.error('Error:', error));
}

// Update cart count when page loads
document.addEventListener('DOMContentLoaded', updateCartCount);

// Update cart count after adding/removing items
function updateCartBadge(count) {
    const cartCount = document.getElementById('cart-count');
    if (cartCount) {
        cartCount.textContent = count;
        cartCount.style.display = count > 0 ? 'inline' : 'none';
    }
}