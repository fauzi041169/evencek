// Register Form Validation
class RegisterValidator {
    constructor() {
        this.form = document.getElementById('registerForm');
        this.submitBtn = document.getElementById('submitBtn');
        this.initializeValidation();
    }

    initializeValidation() {
        // Add event listeners for real-time validation
        this.addInputListeners();
        this.addFormSubmitListener();
    }

    addInputListeners() {
        const inputs = {
            'name': this.validateName.bind(this),
            'email': this.validateEmail.bind(this),
            'password': this.validatePassword.bind(this),
            'password_confirmation': this.validatePasswordConfirmation.bind(this)
        };

        Object.keys(inputs).forEach(fieldName => {
            const input = document.getElementById(fieldName);
            if (input) {
                input.addEventListener('blur', inputs[fieldName]);
                input.addEventListener('input', () => {
                    if (input.value.trim() !== '') {
                        inputs[fieldName]();
                    }
                });
            }
        });

        // Add listeners for role radio buttons
        const roleInputs = document.querySelectorAll('input[name="role"]');
        roleInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.validateRole();
            });
        });
    }

    addFormSubmitListener() {
        if (!this.form) return;
        this.form.addEventListener('submit', (e) => {
            const roleInputs = document.querySelectorAll('input[name="role"]:checked');
            const selectedRole = roleInputs.length > 0 ? roleInputs[0].value : null;

            if (!selectedRole) {
                e.preventDefault();
                this.showGeneralError('Pilih peran Anda (User atau Creator)');
                return;
            }

            // Pastikan nilai role terset sebelum submit
            const formData = new FormData(this.form);
            formData.set('role', selectedRole);

            const isValid = this.validateAll();
            if (!isValid) {
                e.preventDefault();
                this.showGeneralError('Mohon perbaiki kesalahan pada form sebelum melanjutkan.');
            }
        });
    }

    validateAll() {
        const validations = [
            this.validateName(),
            this.validateEmail(),
            this.validatePassword(),
            this.validatePasswordConfirmation(),
            this.validateRole()
        ];
        return validations.every(valid => valid);
    }

    validateRole() {
        const roleInputs = document.querySelectorAll('input[name="role"]');
        const roleError = document.querySelector('.role-error');
        
        // Check if any role is selected
        let roleSelected = false;
        roleInputs.forEach(input => {
            if (input.checked) {
                roleSelected = true;
            }
        });
        
        if (!roleSelected) {
            // Show error message
            if (roleError) {
                roleError.style.display = 'block';
                roleError.textContent = 'Pilih peran Anda (User atau Creator)';
            }
            return false;
        } else {
            // Hide error message
            if (roleError) {
                roleError.style.display = 'none';
            }
            return true;
        }
    }

    validateName() {
        const name = document.getElementById('name');
        const nameError = document.getElementById('nameError');
        const nameErrorText = document.getElementById('nameErrorText');
        
        const value = name.value.trim();
        
        if (value === '') {
            this.showError(name, nameError, nameErrorText, 'Nama harus diisi');
            return false;
        } else if (value.length < 2) {
            this.showError(name, nameError, nameErrorText, 'Nama minimal 2 karakter');
            return false;
        } else if (value.length > 255) {
            this.showError(name, nameError, nameErrorText, 'Nama tidak boleh lebih dari 255 karakter');
            return false;
        } else if (!/^[a-zA-Z\s]+$/.test(value)) {
            this.showError(name, nameError, nameErrorText, 'Nama hanya boleh berisi huruf dan spasi');
            return false;
        } else {
            this.showSuccess(name, nameError);
            return true;
        }
    }


    validateEmail() {
        const email = document.getElementById('email');
        const emailError = document.getElementById('emailError');
        const emailErrorText = document.getElementById('emailErrorText');
        
        const value = email.value.trim();
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        
        if (value === '') {
            this.showError(email, emailError, emailErrorText, 'Email harus diisi');
            return false;
        } else if (!emailRegex.test(value)) {
            this.showError(email, emailError, emailErrorText, 'Format email tidak valid');
            return false;
        } else if (value.length > 255) {
            this.showError(email, emailError, emailErrorText, 'Email tidak boleh lebih dari 255 karakter');
            return false;
        } else {
            this.showSuccess(email, emailError);
            return true;
        }
    }

    validatePassword() {
        const password = document.getElementById('password');
        const passwordError = document.getElementById('passwordError');
        const passwordErrorText = document.getElementById('passwordErrorText');
        
        const value = password.value;
        
        if (value === '') {
            this.showError(password, passwordError, passwordErrorText, 'Password harus diisi');
            return false;
        } else if (value.length < 5) {
            this.showError(password, passwordError, passwordErrorText, 'Password minimal 5 karakter');
            return false;
        } else if (value.length > 255) {
            this.showError(password, passwordError, passwordErrorText, 'Password tidak boleh lebih dari 255 karakter');
            return false;
        } else {
            this.showSuccess(password, passwordError);
            return true;
        }
    }

    validatePasswordConfirmation() {
        const password = document.getElementById('password');
        const passwordConfirmation = document.getElementById('password_confirmation');
        const passwordConfirmationError = document.getElementById('passwordConfirmationError');
        const passwordConfirmationErrorText = document.getElementById('passwordConfirmationErrorText');
        
        const value = passwordConfirmation.value;
        
        if (value === '') {
            this.showError(passwordConfirmation, passwordConfirmationError, passwordConfirmationErrorText, 'Konfirmasi password harus diisi');
            return false;
        } else if (password.value !== value) {
            this.showError(passwordConfirmation, passwordConfirmationError, passwordConfirmationErrorText, 'Konfirmasi password tidak cocok');
            return false;
        } else {
            this.showSuccess(passwordConfirmation, passwordConfirmationError);
            return true;
        }
    }

    showError(input, errorDiv, errorTextDiv, message) {
        input.classList.remove('success');
        input.classList.add('error');
        errorDiv.style.display = 'flex';
        errorTextDiv.textContent = message;
    }

    showSuccess(input, errorDiv) {
        input.classList.remove('error');
        input.classList.add('success');
        errorDiv.style.display = 'none';
    }

    showGeneralError(message) {
        // Create or update general error message
        let errorDiv = document.getElementById('generalError');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'generalError';
            errorDiv.className = 'alert alert-danger';
            errorDiv.style.marginBottom = '20px';
            const parent = (this.form && this.form.parentNode) ? this.form.parentNode : document.body;
            parent.insertBefore(errorDiv, parent.firstChild);
        }
        errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
        errorDiv.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

// Password Strength Checker
class PasswordStrengthChecker {
    constructor() {
        this.passwordInput = document.getElementById('password');
        this.strengthDiv = document.getElementById('passwordStrength');
        this.initialize();
    }

    initialize() {
        if (this.passwordInput && this.strengthDiv) {
            this.passwordInput.addEventListener('input', this.checkStrength.bind(this));
        }
    }

    checkStrength() {
        const password = this.passwordInput.value;
        
        if (password.length === 0) {
            this.strengthDiv.textContent = '';
            return;
        }

        let strength = 0;
        let message = '';
        let className = '';
        let suggestions = [];
        
        // Length checks
        if (password.length >= 5) strength++;
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        
        // Character type checks
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        
        // Determine strength level and suggestions
        if (strength <= 2) {
            message = 'Password lemah';
            className = 'strength-weak';
            suggestions = ['Tambahkan huruf besar', 'Tambahkan angka', 'Tambahkan karakter khusus'];
        } else if (strength <= 4) {
            message = 'Password sedang';
            className = 'strength-medium';
            suggestions = ['Tambahkan karakter khusus', 'Perpanjang password'];
        } else {
            message = 'Password kuat';
            className = 'strength-strong';
            suggestions = [];
        }
        
        // Display result
        this.strengthDiv.textContent = message;
        this.strengthDiv.className = 'password-strength ' + className;
        
        // Show suggestions if any
        if (suggestions.length > 0) {
            this.strengthDiv.title = 'Saran: ' + suggestions.join(', ');
        }
    }
}

// Password Visibility Toggle
class PasswordVisibilityToggle {
    constructor() {
        this.initialize();
    }

    initialize() {
        const passwordFields = ['password', 'password_confirmation'];
        
        passwordFields.forEach(fieldId => {
            const input = document.getElementById(fieldId);
            const toggleBtn = document.getElementById(`toggle${fieldId.charAt(0).toUpperCase() + fieldId.slice(1)}`);
            
            if (input && toggleBtn) {
                toggleBtn.addEventListener('click', () => this.toggleVisibility(input, toggleBtn));
            }
        });
    }

    toggleVisibility(input, toggleBtn) {
        if (input.type === 'password') {
            input.type = 'text';
            toggleBtn.classList.remove('fa-eye');
            toggleBtn.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            toggleBtn.classList.remove('fa-eye-slash');
            toggleBtn.classList.add('fa-eye');
        }
    }
}

// Initialize all validators when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    new RegisterValidator();
    new PasswordStrengthChecker();
    new PasswordVisibilityToggle();
});
