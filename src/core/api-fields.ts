
export const MONITOR_FIELDS_INCLUDE =
  'item_id,title,price,item_state,category_id,published_date,category_name,seller'

export const MONITOR_FIELDS_EXCLUDE =
  'description,information,login,temp_email,email_login_data,item_origin,note'

export const BULK_ITEM_FIELDS_INCLUDE = 'item_id,title,price,item_state,category_id,note,tags'

export function withFieldFilters(
  params: Record<string, string | number | boolean | undefined> = {},
  include = MONITOR_FIELDS_INCLUDE,
  exclude?: string
): Record<string, string | number | boolean | undefined> {
  return {
    ...params,
    fields_include: include,
    ...(exclude ? { fields_exclude: exclude } : {})
  }
}
