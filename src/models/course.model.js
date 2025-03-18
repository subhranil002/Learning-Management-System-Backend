import { model, Schema } from "mongoose";

const courseSchema = new Schema(
    {
        title: {
            type: String,
            required: [true, "Title is required"],
            minLength: [5, "Title should be greater than 5 characters"],
            maxLength: [50, "Title should be less than 50 characters"],
            trim: true,
            unique: true,
        },
        description: {
            type: String,
            required: [true, "Description is required"],
            minLength: [50, "Description should be greater than 50 characters"],
            trim: true,
        },
        category: {
            type: String,
            required: [true, "Category is required"],
            trim: true,
        },
        thumbnail: {
            public_id: {
                type: String,
            },
            secure_url: {
                type: String,
            },
        },
        lectures: [
            {
                title: {
                    type: String,
                    trim: true,
                    minLength: [5, "Title should be greater than 5 characters"],
                    maxLength: [50, "Title should be less than 50 characters"],
                },
                description: {
                    type: String,
                    trim: true,
                    minLength: [
                        50,
                        "Description should be greater than 50 characters",
                    ],
                },
                lecture: {
                    public_id: {
                        type: String,
                    },
                    secure_url: {
                        type: String,
                    },
                },
            },
        ],
        numbersOfLectures: {
            type: Number,
            default: 0,
        },
        createdBy: {
            name: {
                type: String,
            },
            _id: {
                type: Schema.Types.ObjectId,
                ref: "User",
            },
        },
    },
    {
        timestamps: true,
    }
);

courseSchema.pre("save", function (next) {
    this.numbersOfLectures = this.lectures.length;
    next();
});

const Course = model("courses", courseSchema);

export default Course;
