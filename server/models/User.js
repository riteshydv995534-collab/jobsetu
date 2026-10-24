const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 100
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6
    },
    role: {
      type: String,
      enum: [
        'APPLICANT',
        'SCHEME_OFFICER',
        'SCHEME_SUPERVISOR',
        'VERIFICATION_OFFICER',
        'WELFARE_OFFICER',
        'DEPARTMENT_ADMIN',
        'RECORDS_ADMIN',
        'SUPER_ADMIN'
      ],
      required: [true, 'Role is required'],
      default: 'APPLICANT',
      index: true
    },
    assignedSchemes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Scheme',
        index: true
      }
    ],
    linkedIndividual: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Individual',
      index: true
    },
    assignedDistrict: {
      type: String,
      default: 'All'
    },
    permittedActions: {
      type: [String],
      default: ['VIEW', 'SUBMIT']
    },
    approvalStatus: {
      type: String,
      enum: ['APPROVED', 'PENDING_APPROVAL', 'SUSPENDED'],
      default: 'APPROVED',
      index: true
    },
    designation: {
      type: String,
      default: 'Authorized Government Officer'
    },
    badgeNumber: {
      type: String,
      default: 'JS-OFFICER-01'
    },
    department: {
      type: String,
      default: 'Public Distribution & Social Welfare'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema);
