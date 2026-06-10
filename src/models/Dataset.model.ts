import mongoose, { Document, Schema } from ''mongoose'';

export type DatasetType = ''pdf'' | ''txt'' | ''pubmedqa'' | ''bioasq'' | ''medquad'' | ''json'' | ''csv'';
export type DatasetStatus = ''pending'' | ''processing'' | ''indexed'' | ''error'';

export interface IDataset extends Document {
  name: string;
  description?: string;
  type: DatasetType;
  filePath: string;
  fileSize?: number;
  documentCount?: number;
  status: DatasetStatus;
  errorMessage?: string;
  uploadedBy: mongoose.Types.ObjectId;
  indexedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const datasetSchema = new Schema<IDataset>(
  {
    name: {
      type: String,
      required: [true, ''Dataset name is required''],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: [''pdf'', ''txt'', ''pubmedqa'', ''bioasq'', ''medquad'', ''json'', ''csv''],
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileSize: { type: Number },
    documentCount: { type: Number },
    status: {
      type: String,
      enum: [''pending'', ''processing'', ''indexed'', ''error''],
      default: ''pending'',
    },
    errorMessage: { type: String },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: ''User'',
      required: true,
    },
    indexedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IDataset>(''Dataset'', datasetSchema);
