import { pgTable, text, uuid, timestamp, index } from "drizzle-orm/pg-core";


export const users = pgTable("user", {
    id: uuid("id").primaryKey().notNull(),
    phone: text("phone").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),  
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
    index("idx_phone").on(table.phone)
])