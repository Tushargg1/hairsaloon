package com.hairsaloon.testsupport;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class PostgresIntegrationTestSupportTest {
    @Test
    void generatedSchemasAreUniqueAndRestrictedToSafeIdentifiers() {
        String first = PostgresIntegrationTestSupport.schemaName(getClass());
        String second = PostgresIntegrationTestSupport.schemaName(getClass());

        assertThat(first).matches("it_postgresintegrationtests_[a-f0-9]{32}");
        assertThat(second).matches("it_postgresintegrationtests_[a-f0-9]{32}");
        assertThat(second).isNotEqualTo(first);
    }

    @Test
    void scopedUrlAddsCurrentSchemaWithoutDiscardingParameters() {
        String scoped = PostgresIntegrationTestSupport.withCurrentSchema(
            "jdbc:postgresql://localhost/hairsaloon?sslmode=require&connectTimeout=10",
            "it_safe_0123456789abcdef0123456789abcdef");

        assertThat(scoped).isEqualTo(
            "jdbc:postgresql://localhost/hairsaloon?sslmode=require&connectTimeout=10"
                + "&currentSchema=it_safe_0123456789abcdef0123456789abcdef");
    }

    @Test
    void scopedAndAdminUrlsReplaceOnlyTheExactCurrentSchemaParameter() {
        String external = "jdbc:postgresql://localhost/hairsaloon?CURRENTSCHEMA=shared"
            + "&currentSchemaFallback=keep&sslmode=require";

        assertThat(PostgresIntegrationTestSupport.withoutCurrentSchema(external)).isEqualTo(
            "jdbc:postgresql://localhost/hairsaloon?currentSchemaFallback=keep&sslmode=require");
        assertThat(PostgresIntegrationTestSupport.withCurrentSchema(external, "it_generated"))
            .isEqualTo("jdbc:postgresql://localhost/hairsaloon?currentSchemaFallback=keep"
                + "&sslmode=require&currentSchema=it_generated");
    }
}
