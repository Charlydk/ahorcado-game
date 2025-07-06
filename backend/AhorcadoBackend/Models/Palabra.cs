using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AhorcadoBackend.Models
{
    [Table("palabras")] // nombre exacto de la tabla en Supabase
    public class Palabra
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("textoPalabra")]
        public string TextoPalabra { get; set; } = string.Empty;

        [Column("categoria")]
        public string Categoria { get; set; } = string.Empty;

        [Column("dificultad")]
        public string Dificultad { get; set; } = string.Empty;

        [Column("activa")]
        public bool Activa { get; set; } = true;
    }
}
