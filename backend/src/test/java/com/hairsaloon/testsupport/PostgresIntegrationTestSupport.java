package com.hairsaloon.testsupport;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.PostgreSQLContainer;

/** Provides a disposable PostgreSQL schema for each integration-test class. */
public final class PostgresIntegrationTestSupport {
    private static final String IMAGE = "postgres:16.4-alpine";
    private static final Map<Class<?>, Database> DATABASES = new ConcurrentHashMap<>();

    private PostgresIntegrationTestSupport() {
    }

    public static boolean postgresAvailable() {
        if (externalUrl() != null) return true;
        try {
            return DockerClientFactory.instance().isDockerAvailable();
        } catch (RuntimeException unavailable) {
            return false;
        }
    }

    public static void configure(Class<?> testClass, DynamicPropertyRegistry properties) {
        Database database = database(testClass);
        properties.add("spring.datasource.url", database::scopedUrl);
        properties.add("spring.datasource.username", database::username);
        properties.add("spring.datasource.password", database::password);
        properties.add("spring.flyway.default-schema", database::schema);
        properties.add("spring.flyway.schemas", database::schema);
        properties.add("spring.flyway.create-schemas", () -> "true");
    }

    public static Database database(Class<?> testClass) {
        return DATABASES.computeIfAbsent(testClass, PostgresIntegrationTestSupport::start);
    }

    public static Connection connection(Class<?> testClass) throws SQLException {
        Database database = database(testClass);
        return DriverManager.getConnection(
            database.scopedUrl(), database.username(), database.password());
    }
    public static String source(Class<?> testClass) {
        return database(testClass).container() == null ? "TEST_POSTGRES_*" : "docker";
    }

    public static void cleanup(Class<?> testClass) {
        Database database = DATABASES.remove(testClass);
        if (database == null) return;
        if (!database.schema().matches("it_[a-z0-9]+_[a-f0-9]{32}"))
            throw new IllegalStateException("Refusing to drop non-test schema: " + database.schema());
        RuntimeException failure = null;
        try (Connection connection = DriverManager.getConnection(
                database.adminUrl(), database.username(), database.password());
             var statement = connection.createStatement()) {
            statement.execute("DROP SCHEMA IF EXISTS " + quoted(database.schema()) + " CASCADE");
        } catch (SQLException exception) {
            failure = new IllegalStateException(
                "Could not drop integration-test schema " + database.schema(), exception);
        } finally {
            if (database.container() != null) database.container().stop();
        }
        if (failure != null) throw failure;
    }

    private static Database start(Class<?> testClass) {
        String url = externalUrl();
        PostgreSQLContainer<?> container = null;
        String username;
        String password;
        if (url == null) {
            container = new PostgreSQLContainer<>(IMAGE)
                .withDatabaseName("hairsaloon_integration")
                .withUsername("hairsaloon").withPassword("hairsaloon");
            container.start();
            url = container.getJdbcUrl();
            username = container.getUsername();
            password = container.getPassword();
        } else {
            username = env("TEST_POSTGRES_USERNAME", "TEST_POSTGRES_USER", "postgres");
            password = env("TEST_POSTGRES_PASSWORD", null, "postgres");
        }
        String schema = schemaName(testClass);
        String adminUrl = withoutCurrentSchema(url);
        try (Connection connection = DriverManager.getConnection(adminUrl, username, password);
             var statement = connection.createStatement()) {
            statement.execute("CREATE SCHEMA " + quoted(schema));
        } catch (SQLException exception) {
            if (container != null) container.stop();
            throw new IllegalStateException(
                "Could not create isolated integration-test schema " + schema, exception);
        }
        return new Database(adminUrl, withCurrentSchema(adminUrl, schema), username, password,
            schema, container);
    }

    static String schemaName(Class<?> testClass) {
        String owner = testClass.getSimpleName().replaceAll("[^A-Za-z0-9]", "")
            .toLowerCase(Locale.ROOT);
        String random = UUID.randomUUID().toString().replace("-", "");
        return "it_" + owner.substring(0, Math.min(owner.length(), 24)) + "_" + random;
    }

    static String withCurrentSchema(String url, String schema) {
        String urlWithoutSchema = withoutCurrentSchema(url);
        return urlWithoutSchema + (urlWithoutSchema.contains("?") ? "&" : "?")
            + "currentSchema=" + schema;
    }

    static String withoutCurrentSchema(String url) {
        int queryStart = url.indexOf('?');
        if (queryStart < 0) return url;
        String base = url.substring(0, queryStart);
        String query = url.substring(queryStart + 1);
        StringBuilder retained = new StringBuilder();
        for (String parameter : query.split("&")) {
            if (parameter.isBlank()) continue;
            int equals = parameter.indexOf('=');
            String name = equals < 0 ? parameter : parameter.substring(0, equals);
            if (name.equalsIgnoreCase("currentSchema")) continue;
            if (!retained.isEmpty()) retained.append('&');
            retained.append(parameter);
        }
        return retained.isEmpty() ? base : base + '?' + retained.toString();
    }

    private static String quoted(String identifier) {
        return '"' + identifier.replace("\"", "\"\"") + '"';
    }

    private static String externalUrl() {
        String url = System.getenv("TEST_POSTGRES_URL");
        if (url == null || url.isBlank()) url = System.getenv("TEST_POSTGRES_JDBC_URL");
        return url == null || url.isBlank() ? null : url;
    }

    private static String env(String primary, String alternate, String fallback) {
        String value = System.getenv(primary);
        if ((value == null || value.isBlank()) && alternate != null)
            value = System.getenv(alternate);
        return value == null || value.isBlank() ? fallback : value;
    }

    public record Database(String adminUrl, String scopedUrl, String username, String password,
                           String schema, PostgreSQLContainer<?> container) {
    }
}
