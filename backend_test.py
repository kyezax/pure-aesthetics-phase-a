import requests
import sys
import json
from datetime import datetime, timedelta

class BeautySalonAPITester:
    def __init__(self, base_url="https://tint-reservation.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.user_id = None
        self.admin_user_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if self.token and not headers:
            test_headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:200]
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "error": str(e)
            })
            return False, {}

    def test_health_check(self):
        """Test health check endpoint"""
        return self.run_test("Health Check", "GET", "health", 200)

    def test_register_user(self):
        """Test user registration"""
        user_data = {
            "email": f"testuser_{datetime.now().strftime('%H%M%S')}@example.com",
            "password": "TestPass123!",
            "first_name": "Test",
            "last_name": "User",
            "phone": "+1234567890"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=user_data
        )
        
        if success and 'id' in response:
            self.user_id = response['id']
            self.test_user_email = user_data['email']
            self.test_user_password = user_data['password']
            return True
        return False

    def test_login_user(self):
        """Test user login"""
        if not hasattr(self, 'test_user_email'):
            print("❌ Cannot test login - no registered user")
            return False
            
        login_data = {
            "email": self.test_user_email,
            "password": self.test_user_password
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            return True
        return False

    def test_admin_login(self):
        """Test admin login"""
        admin_data = {
            "email": "admin@salon.com",
            "password": "admin123"
        }
        
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data=admin_data
        )
        
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            self.admin_user_id = response['user']['id']
            return True
        return False

    def test_get_me(self):
        """Test get current user info"""
        return self.run_test("Get Current User", "GET", "auth/me", 200)

    def test_get_services(self):
        """Test get all services"""
        success, response = self.run_test("Get Services", "GET", "services", 200)
        
        if success and isinstance(response, list) and len(response) > 0:
            self.test_service_id = response[0]['id']
            print(f"   Found {len(response)} services")
            
            # Check color coding
            color_categories = {}
            for service in response:
                category = service.get('category')
                color = service.get('color_code')
                if category not in color_categories:
                    color_categories[category] = color
                print(f"   Service: {service['name']} | Category: {category} | Color: {color}")
            
            # Verify expected color coding
            expected_colors = {
                'facial': '#10B981',  # Green
                'laser_removal': '#EF4444',  # Red  
                'teeth_whitening': '#3B82F6'  # Blue
            }
            
            for category, expected_color in expected_colors.items():
                if category in color_categories:
                    actual_color = color_categories[category]
                    if actual_color.upper() == expected_color.upper():
                        print(f"✅ Color coding correct for {category}: {actual_color}")
                    else:
                        print(f"❌ Color coding incorrect for {category}: expected {expected_color}, got {actual_color}")
                else:
                    print(f"⚠️  Category {category} not found in services")
            
            return True
        return False

    def test_get_staff(self):
        """Test get staff members"""
        # Use admin token for this
        old_token = self.token
        self.token = self.admin_token
        
        success, response = self.run_test("Get Staff Members", "GET", "staff", 200)
        
        self.token = old_token  # Restore user token
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} staff members")
            if len(response) > 0:
                self.test_staff_id = response[0]['id']
            return True
        return False

    def test_create_appointment(self):
        """Test creating an appointment"""
        if not hasattr(self, 'test_service_id'):
            print("❌ Cannot test appointment creation - no service ID")
            return False
            
        # Schedule appointment for tomorrow at 10 AM
        tomorrow = datetime.now() + timedelta(days=1)
        appointment_time = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0)
        
        appointment_data = {
            "service_id": self.test_service_id,
            "scheduled_at": appointment_time.isoformat(),
            "notes": "Test appointment booking"
        }
        
        if hasattr(self, 'test_staff_id'):
            appointment_data["staff_id"] = self.test_staff_id
        
        success, response = self.run_test(
            "Create Appointment",
            "POST",
            "appointments",
            200,
            data=appointment_data
        )
        
        if success and 'id' in response:
            self.test_appointment_id = response['id']
            return True
        return False

    def test_get_appointments(self):
        """Test getting appointments"""
        success, response = self.run_test("Get Appointments", "GET", "appointments", 200)
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} appointments")
            for apt in response[:3]:  # Show first 3
                print(f"   Appointment: {apt.get('service_name')} - {apt.get('status')}")
            return True
        return False

    def test_dashboard_stats(self):
        """Test dashboard statistics (admin only)"""
        # Use admin token
        old_token = self.token
        self.token = self.admin_token
        
        success, response = self.run_test("Dashboard Stats", "GET", "dashboard/stats", 200)
        
        self.token = old_token  # Restore user token
        
        if success and isinstance(response, dict):
            print(f"   Today's appointments: {response.get('today_appointments', 0)}")
            print(f"   Week appointments: {response.get('week_appointments', 0)}")
            print(f"   Total clients: {response.get('total_clients', 0)}")
            print(f"   Monthly revenue: ${response.get('month_revenue_dollars', 0):.2f}")
            return True
        return False

    def test_update_appointment_status(self):
        """Test updating appointment status (admin only)"""
        if not hasattr(self, 'test_appointment_id'):
            print("❌ Cannot test appointment status update - no appointment ID")
            return False
            
        # Use admin token
        old_token = self.token
        self.token = self.admin_token
        
        success, response = self.run_test(
            "Update Appointment Status",
            "PUT",
            f"appointments/{self.test_appointment_id}/status?status=confirmed",
            200
        )
        
        self.token = old_token  # Restore user token
        return success

    def test_business_settings(self):
        """Test getting business settings"""
        return self.run_test("Business Settings", "GET", "settings", 200)

    def print_summary(self):
        """Print test summary"""
        print(f"\n{'='*60}")
        print(f"📊 TEST SUMMARY")
        print(f"{'='*60}")
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ FAILED TESTS:")
            for i, test in enumerate(self.failed_tests, 1):
                print(f"{i}. {test.get('test', 'Unknown')}")
                if 'error' in test:
                    print(f"   Error: {test['error']}")
                else:
                    print(f"   Expected: {test.get('expected')}, Got: {test.get('actual')}")
                    if test.get('response'):
                        print(f"   Response: {test['response']}")
        
        return self.tests_passed == self.tests_run

def main():
    print("🚀 Starting Beauty Salon API Tests...")
    print(f"Testing against: https://tint-reservation.preview.emergentagent.com/api")
    
    tester = BeautySalonAPITester()
    
    # Run tests in sequence
    tests = [
        tester.test_health_check,
        tester.test_register_user,
        tester.test_login_user,
        tester.test_admin_login,
        tester.test_get_me,
        tester.test_get_services,
        tester.test_get_staff,
        tester.test_create_appointment,
        tester.test_get_appointments,
        tester.test_dashboard_stats,
        tester.test_update_appointment_status,
        tester.test_business_settings
    ]
    
    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"❌ Test {test.__name__} crashed: {str(e)}")
            tester.tests_run += 1
            tester.failed_tests.append({
                "test": test.__name__,
                "error": f"Test crashed: {str(e)}"
            })
    
    # Print summary
    success = tester.print_summary()
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())