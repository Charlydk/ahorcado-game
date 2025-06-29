using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("Partidas")]
public class Partida
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }  // ← uuid en Supabase = Guid en C#

    [Column("aliasjugador1")]
    public string? AliasJugador { get; set; }

    [Column("aliasjugador2")]
    public string? AliasJugador2 { get; set; }

    [Column("fuevictoria")]
    public bool FueVictoria { get; set; }

    [Column("fecha")]
    public DateTime Fecha { get; set; }

    [Column("palabrasecreta")]
    public string PalabraSecreta { get; set; } = string.Empty;

    [Column("esonline")]
    public bool EsOnline { get; set; }
}
