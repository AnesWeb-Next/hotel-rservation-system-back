import { model, Schema } from "mongoose";
import { IRoom } from "../types/models/room.js";

const roomSchema = new Schema<IRoom>(
  {
    title: {
      type: String,
      required: true,
    },

    hotel: {
      type: Schema.Types.ObjectId,
      ref: "hotel",
      required: true,
    },

    price: {
      base: {
        type: Number,
        required: true,
        min: 0,
      },
      discount: {
        type: Number,
        min: 0,
      },
    },

    maxPeople: {
      type: Number,
      required: true,
      min: 1,
    },

    description: {
      type: String,
      required: true,
    },

    roomNumbers: [
      {
        number: {
          type: Number,
          required: true,
        },
        unavailableDates: [
          {
            type: Date,
          },
        ],
      },
    ],

    amenities: [{ type: String }],

    images: [{ type: String }],

    isAvailable: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "user",
    },
  },
  {
    toJSON: {
      versionKey: false,
      virtuals: true,
    },
    toObject: {
      versionKey: false,
      virtuals: true,
    },
    timestamps: true,
  },
);

// =========================
// 📊 Indexes
// =========================

roomSchema.index(
  {
    title: "text",
    description: "text",
    amenities: "text",
  },
  {
    name: "room_search_index",
  },
);

roomSchema.index({ hotel: 1 });
roomSchema.index({ price: 1 });
roomSchema.index({ maxPeople: 1 });
roomSchema.index({ createdAt: -1 });

// =========================
// ⚙️ Hooks
// =========================

roomSchema.pre("save", function () {
  if (this.price.discount && this.price.discount > this.price.base) {
    throw new Error("Discount cannot be greater than base price");
  }
});

roomSchema.pre("findOneAndUpdate", function () {
  const update = this.getUpdate() as {
    $set?: { "price.base"?: number; "price.discount"?: number };
  };

  if (update.$set) {
    const base = update.$set["price.base"];
    const discount = update.$set["price.discount"];

    if (base !== undefined && discount !== undefined && discount > base) {
      throw new Error("Discount cannot be greater than base price");
    }
  }
});

roomSchema.pre("findOneAndDelete", async function () {
  const query = this.getQuery() as { _id?: unknown };
  const roomId = query._id;

  if (roomId) {
    const rateModel = (await import("./rating.js")).default;
    await rateModel.deleteMany({ roomId });
  }
});

roomSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function () {
    const rateModel = (await import("./rating.js")).default;
    await rateModel.deleteMany({ roomId: this._id });
  },
);

// =========================
// 🚀 Model Export
// =========================

const roomModel = model<IRoom>("room", roomSchema);

export default roomModel;
