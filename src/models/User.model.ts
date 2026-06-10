import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = ''guest'' | ''user'' | ''admin'';

export interface IUser extends Document {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  avatar?: string;
  isActive: boolean;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    fullName: {
      type: String,
      required: [true, ''Full name is required''],
      trim: true,
      maxlength: [100, ''Full name cannot exceed 100 characters''],
    },
    email: {
      type: String,
      required: [true, ''Email is required''],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, ''Please enter a valid email''],
    },
    password: {
      type: String,
      required: [true, ''Password is required''],
      minlength: [8, ''Password must be at least 8 characters''],
      select: false,
    },
    role: {
      type: String,
      enum: [''guest'', ''user'', ''admin''],
      default: ''user'',
    },
    avatar: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
    refreshToken: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (
  candidate: string
): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
});

userSchema.set('toJSON', {
  transform(_, ret) {
    delete ret.password;
    delete ret.refreshToken;
    delete ret.resetPasswordToken;
    delete ret.resetPasswordExpires;
    return ret;
  },
});

export default mongoose.model<IUser>('User', userSchema);
