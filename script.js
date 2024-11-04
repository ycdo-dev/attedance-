// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDyJdKzSPpUeAgs1ni5dJD7DviblX2E2B4",
  authDomain: "ycdo---registration-form.firebaseapp.com",
  projectId: "ycdo---registration-form",
  storageBucket: "ycdo---registration-form.firebasestorage.app",
  messagingSenderId: "632743367139",
  appId: "1:632743367139:web:d4f4cdc81329e0925cd0d6",
  measurementId: "G-1NWJ10FCQG"
};

        // Google Sheets Web App URL
        const SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbwrx2r016GHBiQMK8lf7FbgjLhRktH6LBID9YdfWdB4b3yrCkteheL3DQzGYMC6UrsK3Q/exec';

        // Initialize Firebase
        let db;
        try {
            firebase.initializeApp(firebaseConfig);
            db = firebase.firestore();
            console.log('Firebase initialized successfully');
        } catch (error) {
            console.error('Error initializing Firebase:', error);
            showError('មិនអាចភ្ជាប់ទៅកាន់មូលដ្ឋានទិន្នន័យបានទេ');
        }

        // Initialize QR Scanner
        const html5QrcodeScanner = new Html5QrcodeScanner(
            "qr-reader",
            { 
                fps: 10, 
                qrbox: { width: 250, height: 250 },
                rememberLastUsedCamera: true,
                aspectRatio: 1.0
            }
        );

        // QR Code Success Handler
        async function onScanSuccess(decodedText) {
            try {
                const qrData = JSON.parse(decodedText);
                if (!qrData.documentId || !qrData.name || !qrData.phone) {
                    throw new Error('QR code មិនមានទិន្នន័យគ្រប់គ្រាន់');
                }
                await verifyRegistration(qrData);
            } catch (error) {
                showError('QR code មិនត្រឹមត្រូវ។ សូមព្យាយាមម្តងទៀត។');
            }
        }

        // QR Code Error Handler
        function onScanError(error) {
            console.warn('Scan error:', error);
            if (error.includes('NotFound')) {
                showError('រកមិនឃើញកាមេរ៉ា។ សូមពិនិត្យមើលការតភ្ជាប់របស់អ្នក។');
            }
        }

        // Start Scanner
        html5QrcodeScanner.render(onScanSuccess, onScanError);

        // Send data to Google Sheets
        async function sendToGoogleSheets(data) {
            if (!SHEETS_API_URL || SHEETS_API_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
                console.warn('Google Sheets API URL not configured');
                return false;
            }

            try {
                const response = await fetch(SHEETS_API_URL, {
                    method: 'POST',
                    body: JSON.stringify(data),
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    mode: 'no-cors'
                });
                
                console.log('Data sent to Google Sheets');
                return true;
            } catch (error) {
                console.error('Error sending to Google Sheets:', error);
                return false;
            }
        }

        // Verify Registration
        async function verifyRegistration(qrData) {
            showLoading(true);
            hideError();
            try {
                const docRef = await db.collection('registrations').doc(qrData.documentId).get();
                
                if (docRef.exists) {
                    const data = docRef.data();
                    if (data.name === qrData.name && data.phone === qrData.phone) {
                        const sheetsSuccess = await recordAttendance(qrData, data);
                        showSuccessResult(data, sheetsSuccess);
                        playSuccessSound();
                    } else {
                        showError('ទិន្នន័យមិនត្រូវគ្នា។ សូមព្យាយាមម្តងទៀត។');
                    }
                } else {
                    showError('រកមិនឃើញការចុះឈ្មោះ។ សូមព្យាយាមម្តងទៀត។');
                }
            } catch (error) {
                console.error('Verification error:', error);
                showError('មានបញ្ហាក្នុងការផ្ទៀងផ្ទាត់: ' + error.message);
            } finally {
                showLoading(false);
            }
        }

        // Record Attendance
        async function recordAttendance(qrData, userData) {
            try {
                const batch = db.batch();
                
                // Prepare attendance data
                const attendanceData = {
                    documentId: qrData.documentId,
                    name: userData.name,
                    phone: userData.phone,
                    gender: userData.gender || 'N/A',
                    email: userData.email || 'N/A',
                    address: userData.address || 'N/A',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    status: 'មកដល់'
                };

                // Add attendance record
                const attendanceRef = db.collection('attendance').doc();
                batch.set(attendanceRef, attendanceData);

                // Update registration status
                const registrationRef = db.collection('registrations').doc(qrData.documentId);
                batch.update(registrationRef, {
                    lastAttendance: firebase.firestore.FieldValue.serverTimestamp(),
                    status: 'មកដល់'
                });

                // Commit Firebase batch
                await batch.commit();

                // Send to Google Sheets
                const sheetsSuccess = await sendToGoogleSheets(attendanceData);
                return sheetsSuccess;

            } catch (error) {
                console.error('Error recording attendance:', error);
                throw error;
            }
        }

        // UI Helper Functions
        function showSuccessResult(data, sheetsSynced = false) {
            const resultDiv = document.getElementById('result');
            resultDiv.innerHTML = `
                <div class="success">
                    <h3>រកឃើញការចុះឈ្មោះ!</h3>
                    <table class="info-table">
                        <tr>
                            <td>ឈ្មោះ</td>
                            <td>${data.name}</td>
                        </tr>
                        <tr>
                            <td>ភេទ</td>
                            <td>${data.gender || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td>លេខទូរស័ព្ទ</td>
                            <td>${data.phone}</td>
                        </tr>
                        <tr>
                            <td>អ៊ីមែល</td>
                            <td>${data.email || 'គ្មាន'}</td>
                        </tr>
                        <tr>
                            <td>អាសយដ្ឋាន</td>
                            <td>${data.address || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td>ស្ថានភាព</td>
                            <td class="status-success">
                                បានកត់ត្រាវត្តមាន
                                ${sheetsSynced ? 
                                    '<br><small>(បានធ្វើសមកាលកម្មជាមួយ Sheets)</small>' : 
                                    '<br><small>(មិនបានធ្វើសមកាលកម្មជាមួយ Sheets)</small>'}
                            </td>
                        </tr>
                    </table>
                </div>`;
            resultDiv.style.display = 'block';
            
            // Scroll to result
            resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        function showError(message) {
            const errorDiv = document.querySelector('.error-message');
            errorDiv.innerHTML = `<div class="error">${message}</div>`;
            errorDiv.style.display = 'block';
            
            // Show error alert
            Swal.fire({
                icon: 'error',
                title: 'មានបញ្ហា',
                text: message,
                confirmButtonText: 'យល់ព្រម',
                confirmButtonColor: '#764ba2'
            });
        }

        function hideError() {
            const errorDiv = document.querySelector('.error-message');
            errorDiv.style.display = 'none';
        }

        function showLoading(show) {
            const loadingDiv = document.querySelector('.loading');
            loadingDiv.style.display = show ? 'block' : 'none';
        }

        function playSuccessSound() {
            const audio = new Audio('success.mp3');
            audio.play().catch(error => {
                console.warn('Could not play success sound:', error);
            });
        }

        // Test Firebase Connection
        async function testFirebaseConnection() {
            try {
                const testDoc = await db.collection('registrations').limit(1).get();
                console.log('Firebase connection test successful');
                return true;
            } catch (error) {
                console.error('Firebase connection test failed:', error);
                showError('មិនអាចភ្ជាប់ទៅកាន់មូលដ្ឋានទិន្នន័យបានទេ');
                return false;
            }
        }

        // Check duplicate attendance
        async function checkDuplicateAttendance(documentId) {
            try {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                const attendance = await db.collection('attendance')
                    .where('documentId', '==', documentId)
                    .where('timestamp', '>=', today)
                    .get();

                return !attendance.empty;
            } catch (error) {
                console.error('Error checking duplicate attendance:', error);
                return false;
            }
        }

        // Format date for Sheets
        function formatDate(date) {
            const d = date || new Date();
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const hour = String(d.getHours()).padStart(2, '0');
            const minute = String(d.getMinutes()).padStart(2, '0');
            const second = String(d.getSeconds()).padStart(2, '0');
            
            return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
        }

        // Global error handler
        window.onerror = function(msg, url, lineNo, columnNo, error) {
            console.error('Global error:', error);
            showError('មានបញ្ហាកើតឡើង។ សូមព្យាយាមម្តងទៀត។');
            return false;
        };

        // Initialize
        document.addEventListener('DOMContentLoaded', async () => {
            // Test Firebase connection on load
            await testFirebaseConnection();
        });
