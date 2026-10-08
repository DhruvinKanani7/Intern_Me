import mongoose from 'mongoose';

const { Schema } = mongoose;

const auditLogSchema = new Schema({
  actor_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  actor_role: { type: String, default: 'admin', required: true },
  action: { type: String, required: true, index: true },
  target_type: { type: String, required: true, index: true },
  target_id: { type: String, required: true, index: true },
  before_state: { type: Schema.Types.Mixed },
  after_state: { type: Schema.Types.Mixed },
  reason: { type: String },
  ip: { type: String },
  request_id: { type: String },
  created_at: { type: Date, default: Date.now, immutable: true, index: true }
});

// Enforce append-only invariant: throw error on any update or deletion attempt (F27)
const preventModification = function () {
  throw new Error('AuditLog records are append-only and cannot be modified or deleted');
};

auditLogSchema.pre('updateOne', preventModification);
auditLogSchema.pre('updateMany', preventModification);
auditLogSchema.pre('findOneAndUpdate', preventModification);
auditLogSchema.pre('deleteOne', preventModification);
auditLogSchema.pre('deleteMany', preventModification);
auditLogSchema.pre('findOneAndDelete', preventModification);

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
