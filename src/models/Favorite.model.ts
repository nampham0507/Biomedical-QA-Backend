import mongoose, { Document, Schema } from "mongoose";

export interface IFavorite extends Document {
  userId: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const favoriteSchema = new Schema<IFavorite>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    note: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  },
);

favoriteSchema.index({ userId: 1, conversationId: 1 }, { unique: true });

export default mongoose.model<IFavorite>("Favorite", favoriteSchema);
