using System.Text.Json;

namespace AhorcadoBackend.Extensions
{
    public static class SessionExtensions
    {
        // Guarda un objeto en la sesión serializándolo a JSON
        public static void SetObjectAsJson<T>(this ISession session, string key, T value)
        {
            session.SetString(key, JsonSerializer.Serialize(value));
        }

        // Recupera un objeto de la sesión deserializándolo de JSON
        public static T? GetObjectFromJson<T>(this ISession session, string key)
        {
            var value = session.GetString(key);
            return value == null ? default(T) : JsonSerializer.Deserialize<T>(value);
        }
    }
}
