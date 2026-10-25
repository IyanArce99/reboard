
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "admin_audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"after": Json | null,"before": Json | null,"created_at": string,"entity_id": string,"entity_type": string,"id": number,"reason": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"after"?: Json | null,"before"?: Json | null,"created_at"?: string,"entity_id": string,"entity_type": string,"id"?: never,"reason"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"after"?: Json | null,"before"?: Json | null,"created_at"?: string,"entity_id"?: string,"entity_type"?: string,"id"?: never,"reason"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"app_settings": {
                  Row: {
                    "description": string | null,"is_public": boolean,"key": string,"updated_at": string,"updated_by": string | null,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string | null,"is_public"?: boolean,"key": string,"updated_at"?: string,"updated_by"?: string | null,"value": NonNullable<Json>
                  }
                  Update: {
                    "description"?: string | null,"is_public"?: boolean,"key"?: string,"updated_at"?: string,"updated_by"?: string | null,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"board_model_sizes": {
                  Row: {
                    "id": number,"label": string,"length_in": number,"model_id": number,"sort_order": number,"thickness_in": number,"volume_l": number | null,"width_in": number
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: never,"label": string,"length_in": number,"model_id": number,"sort_order"?: number,"thickness_in": number,"volume_l"?: number | null,"width_in": number
                  }
                  Update: {
                    "id"?: never,"label"?: string,"length_in"?: number,"model_id"?: number,"sort_order"?: number,"thickness_in"?: number,"volume_l"?: number | null,"width_in"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "board_model_sizes_model_id_fkey"
      columns: ["model_id"]
isOneToOne: false
      referencedRelation: "board_models"
      referencedColumns: ["id"]
    }
                  ]
                },"board_models": {
                  Row: {
                    "active": boolean,"brand_id": number,"construction": Database["public"]['Enums']["board_construction"],"created_at": string,"description": string | null,"id": number,"name": string,"shape": Database["public"]['Enums']["board_shape"],"slug": string,"source_note": string | null,"updated_at": string,"verification": string,"verified_at": string | null,"verified_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"brand_id": number,"construction": Database["public"]['Enums']["board_construction"],"created_at"?: string,"description"?: string | null,"id"?: never,"name": string,"shape": Database["public"]['Enums']["board_shape"],"slug": string,"source_note"?: string | null,"updated_at"?: string,"verification"?: string,"verified_at"?: string | null,"verified_by"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"brand_id"?: number,"construction"?: Database["public"]['Enums']["board_construction"],"created_at"?: string,"description"?: string | null,"id"?: never,"name"?: string,"shape"?: Database["public"]['Enums']["board_shape"],"slug"?: string,"source_note"?: string | null,"updated_at"?: string,"verification"?: string,"verified_at"?: string | null,"verified_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "board_models_brand_id_fkey"
      columns: ["brand_id"]
isOneToOne: false
      referencedRelation: "brands"
      referencedColumns: ["id"]
    }
                  ]
                },"brands": {
                  Row: {
                    "active": boolean,"aliases": (string)[],"created_at": string,"featured": boolean,"id": number,"intro": string | null,"logo_path": string | null,"merged_into": number | null,"name": string,"slug": string,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"aliases"?: (string)[],"created_at"?: string,"featured"?: boolean,"id"?: never,"intro"?: string | null,"logo_path"?: string | null,"merged_into"?: number | null,"name": string,"slug": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"aliases"?: (string)[],"created_at"?: string,"featured"?: boolean,"id"?: never,"intro"?: string | null,"logo_path"?: string | null,"merged_into"?: number | null,"name"?: string,"slug"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "brands_merged_into_fkey"
      columns: ["merged_into"]
isOneToOne: false
      referencedRelation: "brands"
      referencedColumns: ["id"]
    }
                  ]
                },"contact_events": {
                  Row: {
                    "created_at": string,"id": number,"ip_hash": string | null,"listing_id": number,"method": Database["public"]['Enums']["contact_method"],"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: never,"ip_hash"?: string | null,"listing_id": number,"method": Database["public"]['Enums']["contact_method"],"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: never,"ip_hash"?: string | null,"listing_id"?: number,"method"?: Database["public"]['Enums']["contact_method"],"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "contact_events_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contact_events_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"contact_messages": {
                  Row: {
                    "created_at": string,"email": string,"handled_at": string | null,"handled_by": string | null,"id": number,"ip_hash": string | null,"message": string,"status": string,"topic": Database["public"]['Enums']["contact_topic"],"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email": string,"handled_at"?: string | null,"handled_by"?: string | null,"id"?: never,"ip_hash"?: string | null,"message": string,"status"?: string,"topic": Database["public"]['Enums']["contact_topic"],"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"handled_at"?: string | null,"handled_by"?: string | null,"id"?: never,"ip_hash"?: string | null,"message"?: string,"status"?: string,"topic"?: Database["public"]['Enums']["contact_topic"],"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "contact_messages_handled_by_fkey"
      columns: ["handled_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contact_messages_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"favorites": {
                  Row: {
                    "created_at": string,"listing_id": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"listing_id": number,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"listing_id"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "favorites_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "favorites_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"listing_contacts": {
                  Row: {
                    "listing_id": number,"phone_e164": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "listing_id": number,"phone_e164": string,"updated_at"?: string
                  }
                  Update: {
                    "listing_id"?: number,"phone_e164"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "listing_contacts_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: true
      referencedRelation: "listings"
      referencedColumns: ["id"]
    }
                  ]
                },"listing_photos": {
                  Row: {
                    "created_at": string,"height": number | null,"id": string,"label": string | null,"listing_id": number,"position": number,"storage_path": string,"width": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"height"?: number | null,"id"?: string,"label"?: string | null,"listing_id": number,"position": number,"storage_path": string,"width"?: number | null
                  }
                  Update: {
                    "created_at"?: string,"height"?: number | null,"id"?: string,"label"?: string | null,"listing_id"?: number,"position"?: number,"storage_path"?: string,"width"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "listing_photos_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    }
                  ]
                },"listings": {
                  Row: {
                    "accessories": string | null,"brand_id": number | null,"brand_text": string | null,"condition": Database["public"]['Enums']["board_condition"],"confirmed_at": string | null,"construction": Database["public"]['Enums']["board_construction"],"construction_source": Database["public"]['Enums']["data_source"],"contact_method": Database["public"]['Enums']["contact_method"],"created_at": string,"description": string | null,"fins": string | null,"id": number,"length_in": number,"length_source": Database["public"]['Enums']["data_source"],"model_id": number | null,"model_size_id": number | null,"model_text": string | null,"moderation": Database["public"]['Enums']["moderation_state"],"previous_price_eur": number | null,"price_eur": number,"public_id": string | null,"published_at": string | null,"repairs": string | null,"reserved_at": string | null,"seller_id": string,"shape": Database["public"]['Enums']["board_shape"],"shape_source": Database["public"]['Enums']["data_source"],"size_label": string,"slug": string,"sold_at": string | null,"status": Database["public"]['Enums']["listing_status"],"thickness_in": number | null,"thickness_source": Database["public"]['Enums']["data_source"] | null,"town": string,"updated_at": string,"volume_l": number | null,"volume_source": Database["public"]['Enums']["data_source"] | null,"width_in": number | null,"width_source": Database["public"]['Enums']["data_source"] | null,"zone_slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accessories"?: string | null,"brand_id"?: number | null,"brand_text"?: string | null,"condition": Database["public"]['Enums']["board_condition"],"confirmed_at"?: string | null,"construction": Database["public"]['Enums']["board_construction"],"construction_source"?: Database["public"]['Enums']["data_source"],"contact_method"?: Database["public"]['Enums']["contact_method"],"created_at"?: string,"description"?: string | null,"fins"?: string | null,"id"?: number,"length_in": number,"length_source"?: Database["public"]['Enums']["data_source"],"model_id"?: number | null,"model_size_id"?: number | null,"model_text"?: string | null,"moderation"?: Database["public"]['Enums']["moderation_state"],"previous_price_eur"?: number | null,"price_eur": number,"public_id"?: never,"published_at"?: string | null,"repairs"?: string | null,"reserved_at"?: string | null,"seller_id"?: string,"shape": Database["public"]['Enums']["board_shape"],"shape_source"?: Database["public"]['Enums']["data_source"],"size_label": string,"slug": string,"sold_at"?: string | null,"status"?: Database["public"]['Enums']["listing_status"],"thickness_in"?: number | null,"thickness_source"?: Database["public"]['Enums']["data_source"] | null,"town": string,"updated_at"?: string,"volume_l"?: number | null,"volume_source"?: Database["public"]['Enums']["data_source"] | null,"width_in"?: number | null,"width_source"?: Database["public"]['Enums']["data_source"] | null,"zone_slug": string
                  }
                  Update: {
                    "accessories"?: string | null,"brand_id"?: number | null,"brand_text"?: string | null,"condition"?: Database["public"]['Enums']["board_condition"],"confirmed_at"?: string | null,"construction"?: Database["public"]['Enums']["board_construction"],"construction_source"?: Database["public"]['Enums']["data_source"],"contact_method"?: Database["public"]['Enums']["contact_method"],"created_at"?: string,"description"?: string | null,"fins"?: string | null,"id"?: number,"length_in"?: number,"length_source"?: Database["public"]['Enums']["data_source"],"model_id"?: number | null,"model_size_id"?: number | null,"model_text"?: string | null,"moderation"?: Database["public"]['Enums']["moderation_state"],"previous_price_eur"?: number | null,"price_eur"?: number,"public_id"?: never,"published_at"?: string | null,"repairs"?: string | null,"reserved_at"?: string | null,"seller_id"?: string,"shape"?: Database["public"]['Enums']["board_shape"],"shape_source"?: Database["public"]['Enums']["data_source"],"size_label"?: string,"slug"?: string,"sold_at"?: string | null,"status"?: Database["public"]['Enums']["listing_status"],"thickness_in"?: number | null,"thickness_source"?: Database["public"]['Enums']["data_source"] | null,"town"?: string,"updated_at"?: string,"volume_l"?: number | null,"volume_source"?: Database["public"]['Enums']["data_source"] | null,"width_in"?: number | null,"width_source"?: Database["public"]['Enums']["data_source"] | null,"zone_slug"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "listings_brand_id_fkey"
      columns: ["brand_id"]
isOneToOne: false
      referencedRelation: "brands"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listings_model_id_fkey"
      columns: ["model_id"]
isOneToOne: false
      referencedRelation: "board_models"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listings_model_size_id_fkey"
      columns: ["model_size_id"]
isOneToOne: false
      referencedRelation: "board_model_sizes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listings_seller_id_fkey"
      columns: ["seller_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listings_zone_slug_fkey"
      columns: ["zone_slug"]
isOneToOne: false
      referencedRelation: "zones"
      referencedColumns: ["slug"]
    }
                  ]
                },"moderation_actions": {
                  Row: {
                    "action": string,"created_at": string,"id": number,"listing_id": number,"moderator_id": string,"reason": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"created_at"?: string,"id"?: never,"listing_id": number,"moderator_id": string,"reason"?: string | null
                  }
                  Update: {
                    "action"?: string,"created_at"?: string,"id"?: never,"listing_id"?: number,"moderator_id"?: string,"reason"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "moderation_actions_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "moderation_actions_moderator_id_fkey"
      columns: ["moderator_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"display_name": string,"id": string,"role": Database["public"]['Enums']["user_role"],"seller_type": Database["public"]['Enums']["seller_type"],"suspended_at": string | null,"suspended_by": string | null,"suspension_reason": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name"?: string,"id": string,"role"?: Database["public"]['Enums']["user_role"],"seller_type"?: Database["public"]['Enums']["seller_type"],"suspended_at"?: string | null,"suspended_by"?: string | null,"suspension_reason"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"id"?: string,"role"?: Database["public"]['Enums']["user_role"],"seller_type"?: Database["public"]['Enums']["seller_type"],"suspended_at"?: string | null,"suspended_by"?: string | null,"suspension_reason"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"reports": {
                  Row: {
                    "created_at": string,"details": string | null,"id": number,"listing_id": number,"reason": Database["public"]['Enums']["report_reason"],"reporter_id": string,"resolved_at": string | null,"resolved_by": string | null,"status": Database["public"]['Enums']["report_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"details"?: string | null,"id"?: never,"listing_id": number,"reason": Database["public"]['Enums']["report_reason"],"reporter_id"?: string,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: Database["public"]['Enums']["report_status"]
                  }
                  Update: {
                    "created_at"?: string,"details"?: string | null,"id"?: never,"listing_id"?: number,"reason"?: Database["public"]['Enums']["report_reason"],"reporter_id"?: string,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: Database["public"]['Enums']["report_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"shops": {
                  Row: {
                    "address": string | null,"created_at": string,"hours": string | null,"id": number,"inventory_source": string | null,"name": string,"profile_id": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"slug": string,"status": string,"status_reason": string | null,"town": string,"type": Database["public"]['Enums']["seller_type"],"updated_at": string,"zone_slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"created_at"?: string,"hours"?: string | null,"id"?: never,"inventory_source"?: string | null,"name": string,"profile_id"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"slug": string,"status"?: string,"status_reason"?: string | null,"town": string,"type": Database["public"]['Enums']["seller_type"],"updated_at"?: string,"zone_slug": string
                  }
                  Update: {
                    "address"?: string | null,"created_at"?: string,"hours"?: string | null,"id"?: never,"inventory_source"?: string | null,"name"?: string,"profile_id"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"slug"?: string,"status"?: string,"status_reason"?: string | null,"town"?: string,"type"?: Database["public"]['Enums']["seller_type"],"updated_at"?: string,"zone_slug"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "shops_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shops_zone_slug_fkey"
      columns: ["zone_slug"]
isOneToOne: false
      referencedRelation: "zones"
      referencedColumns: ["slug"]
    }
                  ]
                },"zones": {
                  Row: {
                    "active": boolean,"name": string,"region_slug": string | null,"slug": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"name": string,"region_slug"?: string | null,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "active"?: boolean,"name"?: string,"region_slug"?: string | null,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "admin_get_user":
{ Args: { "p_user": string }; Returns: {
              "banned_until": string,"created_at": string,"display_name": string,"email": string,"email_confirmed": boolean,"has_mfa": boolean,"id": string,"last_sign_in_at": string,"role": Database["public"]['Enums']["user_role"],"seller_type": Database["public"]['Enums']["seller_type"],"suspended_at": string,"suspension_reason": string
            }[]
                           },
"admin_list_users":
{ Args: { "p_limit"?: number,"p_offset"?: number,"p_search"?: string,"p_status"?: string }; Returns: {
              "created_at": string,"display_name": string,"email": string,"id": string,"last_sign_in_at": string,"listings_active": number,"listings_total": number,"role": Database["public"]['Enums']["user_role"],"seller_type": Database["public"]['Enums']["seller_type"],"suspended_at": string,"total_count": number
            }[]
                           },
"admin_log":
{ Args: { "p_action": string,"p_actor": string,"p_after": Json,"p_before": Json,"p_entity_id": string,"p_entity_type": string,"p_reason": string }; Returns: undefined
                           },
"admin_merge_brands":
{ Args: { "p_from": number,"p_into": number,"p_reason": string }; Returns: undefined
                           },
"admin_moderate_listing":
{ Args: { "p_action": string,"p_public_id": string,"p_reason": string }; Returns: undefined
                           },
"admin_reactivate_user":
{ Args: { "p_reason": string,"p_user": string }; Returns: undefined
                           },
"admin_set_model_verification":
{ Args: { "p_model": number,"p_reason": string,"p_verified": boolean }; Returns: undefined
                           },
"admin_set_role":
{ Args: { "p_reason": string,"p_role": Database["public"]['Enums']["user_role"],"p_user": string }; Returns: undefined
                           },
"admin_set_shop_status":
{ Args: { "p_reason": string,"p_shop": number,"p_status": string }; Returns: undefined
                           },
"admin_stats":
{ Args: { "p_days"?: number }; Returns: Json
                           },
"admin_status":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"admin_suspend_user":
{ Args: { "p_hide_listings"?: boolean,"p_reason": string,"p_user": string }; Returns: number
                           },
"admin_update_listing":
{ Args: { "p_patch": Json,"p_public_id": string,"p_reason": string }; Returns: undefined
                           },
"admin_update_setting":
{ Args: { "p_key": string,"p_reason": string,"p_value": Json }; Returns: undefined
                           },
"admin_user_emails":
{ Args: { "p_ids": (string)[] }; Returns: {
              "email": string,"id": string
            }[]
                           },
"admin_with_reason":
{ Args: { "p_reason": string }; Returns: undefined
                           },
"count_listings":
{ Args: { "p": Json,"p_exclude_zone"?: string,"p_statuses"?: (Database["public"]['Enums']["listing_status"])[],"p_unknown_volume"?: boolean }; Returns: number
                           },
"expire_listings":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_moderator":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_suspended":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"listing_facets":
{ Args: { "p": Json }; Returns: {
              "dimension": string,"key": string,"n": number
            }[]
                           },
"listing_photo_quota_ok":
{ Args: { "p_name": string }; Returns: boolean
                           },
"listing_save_count":
{ Args: { "p_public_id": string }; Returns: number
                           },
"matching_listings":
{ Args: { "p": Json,"p_exclude_zone"?: string,"p_statuses"?: (Database["public"]['Enums']["listing_status"])[],"p_unknown_volume"?: boolean,"skip"?: string }; Returns: {
              "accessories": string | null,
"brand_id": number | null,
"brand_text": string | null,
"condition": Database["public"]['Enums']["board_condition"],
"confirmed_at": string | null,
"construction": Database["public"]['Enums']["board_construction"],
"construction_source": Database["public"]['Enums']["data_source"],
"contact_method": Database["public"]['Enums']["contact_method"],
"created_at": string,
"description": string | null,
"fins": string | null,
"id": number,
"length_in": number,
"length_source": Database["public"]['Enums']["data_source"],
"model_id": number | null,
"model_size_id": number | null,
"model_text": string | null,
"moderation": Database["public"]['Enums']["moderation_state"],
"previous_price_eur": number | null,
"price_eur": number,
"public_id": string | null,
"published_at": string | null,
"repairs": string | null,
"reserved_at": string | null,
"seller_id": string,
"shape": Database["public"]['Enums']["board_shape"],
"shape_source": Database["public"]['Enums']["data_source"],
"size_label": string,
"slug": string,
"sold_at": string | null,
"status": Database["public"]['Enums']["listing_status"],
"thickness_in": number | null,
"thickness_source": Database["public"]['Enums']["data_source"] | null,
"town": string,
"updated_at": string,
"volume_l": number | null,
"volume_source": Database["public"]['Enums']["data_source"] | null,
"width_in": number | null,
"width_source": Database["public"]['Enums']["data_source"] | null,
"zone_slug": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "listings"
        isOneToOne: false
        isSetofReturn: true
      } },
"my_listing_save_counts":
{ Args: Record<PropertyKey, never>; Returns: {
              "n": number,"public_id": string
            }[]
                           },
"require_admin":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"reveal_contact":
{ Args: { "p_ip_hash": string,"p_public_id": string,"p_user": string }; Returns: {
              "method": Database["public"]['Enums']["contact_method"],"phone_e164": string
            }[]
                           },
"search_listings":
{ Args: { "p": Json,"p_exclude_zone"?: string,"p_here"?: string,"p_limit"?: number,"p_offset"?: number,"p_sort"?: string,"p_statuses"?: (Database["public"]['Enums']["listing_status"])[],"p_unknown_volume"?: boolean }; Returns: {
              "accessories": string | null,
"brand_id": number | null,
"brand_text": string | null,
"condition": Database["public"]['Enums']["board_condition"],
"confirmed_at": string | null,
"construction": Database["public"]['Enums']["board_construction"],
"construction_source": Database["public"]['Enums']["data_source"],
"contact_method": Database["public"]['Enums']["contact_method"],
"created_at": string,
"description": string | null,
"fins": string | null,
"id": number,
"length_in": number,
"length_source": Database["public"]['Enums']["data_source"],
"model_id": number | null,
"model_size_id": number | null,
"model_text": string | null,
"moderation": Database["public"]['Enums']["moderation_state"],
"previous_price_eur": number | null,
"price_eur": number,
"public_id": string | null,
"published_at": string | null,
"repairs": string | null,
"reserved_at": string | null,
"seller_id": string,
"shape": Database["public"]['Enums']["board_shape"],
"shape_source": Database["public"]['Enums']["data_source"],
"size_label": string,
"slug": string,
"sold_at": string | null,
"status": Database["public"]['Enums']["listing_status"],
"thickness_in": number | null,
"thickness_source": Database["public"]['Enums']["data_source"] | null,
"town": string,
"updated_at": string,
"volume_l": number | null,
"volume_source": Database["public"]['Enums']["data_source"] | null,
"width_in": number | null,
"width_source": Database["public"]['Enums']["data_source"] | null,
"zone_slug": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "listings"
        isOneToOne: false
        isSetofReturn: true
      } },
"setting_bool":
{ Args: { "p_default": boolean,"p_key": string }; Returns: boolean
                           },
"setting_int":
{ Args: { "p_default": number,"p_key": string }; Returns: number
                           },
"similar_listings":
{ Args: { "p_limit"?: number,"p_public_id": string }; Returns: {
              "accessories": string | null,
"brand_id": number | null,
"brand_text": string | null,
"condition": Database["public"]['Enums']["board_condition"],
"confirmed_at": string | null,
"construction": Database["public"]['Enums']["board_construction"],
"construction_source": Database["public"]['Enums']["data_source"],
"contact_method": Database["public"]['Enums']["contact_method"],
"created_at": string,
"description": string | null,
"fins": string | null,
"id": number,
"length_in": number,
"length_source": Database["public"]['Enums']["data_source"],
"model_id": number | null,
"model_size_id": number | null,
"model_text": string | null,
"moderation": Database["public"]['Enums']["moderation_state"],
"previous_price_eur": number | null,
"price_eur": number,
"public_id": string | null,
"published_at": string | null,
"repairs": string | null,
"reserved_at": string | null,
"seller_id": string,
"shape": Database["public"]['Enums']["board_shape"],
"shape_source": Database["public"]['Enums']["data_source"],
"size_label": string,
"slug": string,
"sold_at": string | null,
"status": Database["public"]['Enums']["listing_status"],
"thickness_in": number | null,
"thickness_source": Database["public"]['Enums']["data_source"] | null,
"town": string,
"updated_at": string,
"volume_l": number | null,
"volume_source": Database["public"]['Enums']["data_source"] | null,
"width_in": number | null,
"width_source": Database["public"]['Enums']["data_source"] | null,
"zone_slug": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "listings"
        isOneToOne: false
        isSetofReturn: true
      } }
          }
          Enums: {
            "board_condition": "como-nueva"|"muy-buen-estado"|"buen-estado"|"con-reparaciones","board_construction": "pu"|"epoxy"|"softboard","board_shape": "shortboard"|"fish"|"hibrida"|"evolutiva"|"midlength"|"longboard"|"gun","contact_method": "whatsapp"|"phone","contact_topic": "anuncio"|"tienda"|"privacidad"|"otra","data_source": "seller"|"manufacturer","listing_status": "draft"|"published"|"sold"|"expired"|"withdrawn","moderation_state": "visible"|"flagged"|"removed","report_reason": "fraude"|"datos-falsos"|"fotos"|"vendida"|"duplicado"|"inapropiado"|"otro","report_status": "open"|"resolved"|"dismissed","seller_type": "particular"|"tienda"|"escuela","user_role": "user"|"moderator"|"admin"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "board_condition": ["como-nueva", "muy-buen-estado", "buen-estado", "con-reparaciones"],"board_construction": ["pu", "epoxy", "softboard"],"board_shape": ["shortboard", "fish", "hibrida", "evolutiva", "midlength", "longboard", "gun"],"contact_method": ["whatsapp", "phone"],"contact_topic": ["anuncio", "tienda", "privacidad", "otra"],"data_source": ["seller", "manufacturer"],"listing_status": ["draft", "published", "sold", "expired", "withdrawn"],"moderation_state": ["visible", "flagged", "removed"],"report_reason": ["fraude", "datos-falsos", "fotos", "vendida", "duplicado", "inapropiado", "otro"],"report_status": ["open", "resolved", "dismissed"],"seller_type": ["particular", "tienda", "escuela"],"user_role": ["user", "moderator", "admin"]
          }
        }
} as const
