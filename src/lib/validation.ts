import { z } from "zod";

export const vendorSchema = z.object({
  name: z.string().min(1, "Vendor name is required"),
  address: z.string().optional(),
  website: z.string().url("Invalid website URL").optional().or(z.literal("")),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
});

export type VendorFormData = z.infer<typeof vendorSchema>;
